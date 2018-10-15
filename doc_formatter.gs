function DocFormatter(doc) {
  var brackets = [ '’', '`', '\'', '"' ];
    
  this.applyConstValues = function(values) {
    var body = doc.getBody();
    var textBody = body.editAsText();
    for(var k in values) {
      var r = textBody.replaceText(Utilities.formatString('{%s}', k), values[k]);
    }
    return this;
  };

  this.applyIfTags = function() {
    replaceIfTags(doc);
    return this;
  };
  
  this.applyPriceOptions = function(responses) {
    processNamedBlock(doc, responses);
    return this;
  }
  
  this.asPdf = function() {
    return doc.getAs('application/pdf');
  }
  
  var parseConfig = {
    endIfString: '{/if}',
    startIfString: '{if',
    startOptionString: '{option',
    endOptionString: '{/option}',
    startBlock: '{',
    endBlock: '}'
  };
  
  var namedBlockPostProcessors = {
    option: function(textBody, results) {
      var totalCost = 0;
      for (var i=0; i<results.length; i++) {
        totalCost += results[i].cost;
      }
      textBody.replaceText('{totalCost}', totalCost)
    }
  };
  
  var namedBlockProcessors = {
    option: function(textBody, namedTag, responses) {
      var result = {};
      var response = responses[namedTag.attributes.name];
      var keepBlock = false;
      if (response) {
        if (Array.isArray(response)) {
          keepBlock = response.indexOf(namedTag.attributes.value) >= 0;
        } else {
          keepBlock = response == namedTag.attributes;
        }
        replaceTagBlock(textBody, namedTag.block, !keepBlock);
        if (keepBlock) {
          var deltaToInternalBlocks = namedTag.block.firstEnd - namedTag.block.firstStart + 1;
          for (var i=namedTag.block.internalBlocks.length-1; i>=0; i--) {
            var internalBlock = namedTag.block.internalBlocks[i];
            var val = parseFloat(namedTag.attributes[internalBlock.name].replace(',', '.'));
            textBody.deleteText(internalBlock.start - deltaToInternalBlocks, internalBlock.end - deltaToInternalBlocks);
            textBody.insertText(internalBlock.start - deltaToInternalBlocks, val);
            result[internalBlock.name] = val;
          }
        }
      }
      return result;
    },
    'if': function(textBody, ifBlock) {
      var comparsion = buildComparsion(ifBlock.command);
      Logger.log(comparsion);
      var keepValue = executeComparsion(comparsion);
      Logger.log(ifBlock);
      if (canExecute(comparsion)) {
        replaceTagBlock(textBody, ifBlock, !keepValue);
        return keepValue;
      }
      return false;
    }
  };
  
  function replaceIfTags(doc) {
    var worker = function(textBody) {
      var ifBlock = findBlock(textBody.getText().toLowerCase(), parseConfig.startIfString, parseConfig.endIfString);
      Logger.log(ifBlock);
      if (ifBlock) {
        var result = namedBlockProcessors[ifBlock.name](textBody, ifBlock);
        return true;
      }
      return false;
    }
    processBlock(doc, worker);
  }
  
  function processNamedBlock(doc, responses) {
    var result = {};
    var worker = function(textBody) {
      var block = findBlock(textBody.getText(), parseConfig.startOptionString, parseConfig.endOptionString);
      if (block) {
        var namedTag = buildNamedTag(block);
        Logger.log(namedTag);
        var processor = namedBlockProcessors[block.name];
        var processed = processor && processor(textBody, namedTag, responses);
        (result[block.name] || (result[block.name] = [])).push(processed);
        Logger.log(result);
        return true;
      }
      return false;
    }
    processBlock(doc, worker);
    
    var textBody = doc.getBody().editAsText();
    var keys = Object.keys(result);
    for (var i=0; i<keys.length; i++) {
      var key = keys[i];
      var values = result[key];
      namedBlockPostProcessors[key] && namedBlockPostProcessors[key](textBody, values);
    }
    return result;
  }

  function processBlock(doc, processFunction) {
    var body = doc.getBody();
    var prevResult = undefined;
    do {
      var textBody = body.editAsText();
      var result = processFunction(textBody);
    } while (result)
  }
  
  function findBlock(stringBody, start, end) {
    var firstStart = stringBody.indexOf(start);
    if (firstStart < 0) { return; }
    var firstEnd = -1;
    var lastStart = stringBody.indexOf(end);
    var lastEnd = lastStart + end.length;
    for(var i=firstStart + start.length; i < stringBody.length; i++){
      if (stringBody[i] == parseConfig.endBlock) { firstEnd = i; break; }
    }
    var block = {
      firstStart: firstStart,
      firstEnd: firstEnd,
      lastStart: lastStart,
      lastEnd: lastEnd,
      command: stringBody.substring(firstStart, firstEnd+1),
      fullString: stringBody.substring(firstStart, lastEnd),
      internalBlocks: []
    };
    var textPartStart = block.firstEnd-block.firstStart;
    var textPartEnd = block.fullString.length - (block.lastEnd - block.lastStart);
    var buffer = '';
    var internalBlock = undefined;
    for(var i=textPartStart; i<textPartEnd; i++) {
      var char = block.fullString[i];
      if (char == parseConfig.endBlock && internalBlock) {
        internalBlock.end = block.firstStart + i;
        internalBlock.name = buffer;
        block.internalBlocks.push(internalBlock);
        internalBlock = undefined;
        buffer = '';
        continue;
      }
      if (char == parseConfig.startBlock) {
        internalBlock = { start: block.firstStart + i };
        continue;
      }
      if (internalBlock) {
        buffer += char;
      }
    }
    block.name = block.command.substring(1, block.command.indexOf(' '));
    return block;
  }

  function replaceTagBlock(textBody, block, removeTagWithText) {
    if (removeTagWithText) {
      var removeFrom = block.firstStart;
      if (textBody.getText()[block.firstStart - 1] == '\n') { removeFrom -= 1; }
      textBody.deleteText(removeFrom, block.lastEnd - 1);
    } else {
      textBody.deleteText(block.lastStart, block.lastEnd - 1);
      textBody.deleteText(block.firstStart, block.firstEnd);
    }
  }
    
  function canExecute(command) {
    return command.lPart.indexOf(parseConfig.startBlock) < 0 && command.lPart.indexOf(parseConfig.endBlock) < 0;
  }
    
  var comparsions = {
    simple: ['=', '==', '!='],
    numeric: ['>', '<', '<=', '>='],
    contains: ['in', 'not_in']
  }
  
  function executeComparsion(command) {
    if (!command.op) {
      return command.lPart == '1' || command.lPart == 'true'
    }
    if (comparsions.simple.indexOf(command.op) >= 0) {
      switch(command.op) {
        case '=':
          return command.lPart == command.rPart;
        case '==':
          return command.lPart == command.rPart;
        case '!=':
          return command.lPart != command.rPart;
      }
    }
    if (comparsions.numeric.indexOf(command.op) >= 0) {
      var lPart = Number(command.lPart), rPart = Number(command.rPart);
      switch(command.op) {
        case '>':
          return lPart > rPart;
        case '<':
          return lPart < rPart;
        case '>=':
          return lPart >= rPart;
        case '<=':
          return lPart <= rPart;
      }
    }
    if (comparsions.contains.indexOf(command.op) >= 0) {
      var array = command.rPart.split(',');
      for (var i=0; i<array.length; i++) {
        array[i] = array[i].trim(' ');
      }
      switch(command.op) {
        case 'in':
          return array.indexOf(command.lPart) >= 0;
        case 'not_in':
          return array.indexOf(command.lPart) < 0;
      }
    }
    return false;
  }
    
  function buildNamedTag(blockWithDetails) {
    var blockName = blockWithDetails.command.substring(1, blockWithDetails.command.indexOf(' '));
    var command = blockWithDetails.command.substring(
      blockWithDetails.command.indexOf(' '),
      blockWithDetails.command.indexOf(parseConfig.endBlock)
    );
    var attributes = {};
    var bracket = '';
    var name = '';
    var buffer = '';
    var setToAttribute = function() {
      bracket = '';
      if (name != '') {
        attributes[name.toLowerCase()] = buffer; name = ''; buffer = '';
      }
    }
    for (var i=0; i<command.length; i++) {
      var char = command[i];
      if (bracket == '' && char == ' ') {
        setToAttribute(); continue;
      }
      if (brackets.indexOf(char) >= 0) {
        if (bracket == '') { bracket = char; continue; }
        if (bracket == char) { setToAttribute(); continue; }
      }
      if (bracket != '') { buffer += char; continue; }
      if (char == '=') {
        name = buffer;
        buffer = '';
        continue;
      }
      buffer += char;
    }
    if (buffer != '') { setToAttribute(); }
    return { attributes: attributes, block: blockWithDetails };
  }
  
  function buildComparsion(commandPart) {
    commandPart = commandPart.substring(
      commandPart.indexOf(' '),
      commandPart.indexOf(parseConfig.endBlock)
    );
    var parts = [];
    var buffer = '';
    var bracket = '';
    var operators = [ '>', '>=' , '=' , '<', '<=', '!=', 'in', 'not_in' ];
    var logical = [ 'and', 'or' ];
    for (var i=0; i<commandPart.length; i++) {
      var char = commandPart[i];
      if (bracket == '' && char == ' ') {
        if (buffer == '') { continue; }
        parts.push(buffer); buffer = ''; continue;
      }
      if (brackets.indexOf(char) >= 0) {
        if (bracket == '') { bracket = char; continue; }
        if (bracket == char) { parts.push(buffer); buffer = ''; bracket = ''; continue; }
      }
      if (bracket != '') { buffer += char; continue; }
      buffer += char;
      if (buffer != char && operators.indexOf(buffer) >= 0 || logical.indexOf(buffer) >= 0) {
        parts.push(buffer);
        buffer = '';
        bracket = '';
      }
    }
    if (buffer != '') { parts.push(buffer); }
    return parts.length == 1 ? { lPart: parts[0] } : { lPart: parts[0], op: parts[1], rPart: parts[2], block: undefined };
  }
}