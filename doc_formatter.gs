function DocFormatter(doc) {
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
  
  this.asPdf = function() {
    return doc.getAs('application/pdf');
  }
  
  var parseConfig = {
    endString: '{/if}',
    startString: '{if',
    startBlock: '{',
    endBlock: '}'
  };
  
  function replaceIfTags(doc) {
    var body = doc.getBody();
    var prevResult = undefined;
    do {
      var textBody = body.editAsText();
      var ifTagParsed = findIfBlock(textBody.getText().toLowerCase());
      Logger.log(ifTagParsed);
      if (ifTagParsed) {
        var result = processIfTag(textBody, ifTagParsed);
      }
    } while (ifTagParsed)
  }
  
  function findIfBlock(stringBody) {
    var firstIfStart = stringBody.indexOf(parseConfig.startString);
    if (firstIfStart < 0) { return; }
    var firstIfEnd = -1;
    var lastIfStart = stringBody.indexOf(parseConfig.endString);
    var lastIfEnd = lastIfStart + 4;
    for(var i=firstIfStart + parseConfig.startString.length; i < stringBody.length; i++){
      if (stringBody[i] == parseConfig.endBlock) { firstIfEnd = i; break; }
    }
    return {
      firstIfStart: firstIfStart,
      firstIfEnd: firstIfEnd,
      lastIfStart: lastIfStart,
      lastIfEnd: lastIfEnd,
      ifBlock: stringBody.substring(firstIfStart, firstIfEnd+1)
    }
  }
  
  function processIfTag(textBody, ifTagParsed) {
    var comparsion = buildComparsion(ifTagParsed.ifBlock);
    Logger.log(comparsion);
    var comparsionResult = executeComparsion(comparsion);
    if (canExecute(comparsion)) {
      if (!comparsionResult) {
        textBody.deleteText(ifTagParsed.firstIfStart, ifTagParsed.lastIfEnd);
      } else {
        textBody.deleteText(ifTagParsed.lastIfStart, ifTagParsed.lastIfEnd);
        textBody.deleteText(ifTagParsed.firstIfStart, ifTagParsed.firstIfEnd);
      }
      return comparsionResult;
    }
    return false;
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
    
    function buildComparsion(commandPart) {
      commandPart = commandPart.substring(
        commandPart.indexOf(parseConfig.startString) + parseConfig.startString.length,
        commandPart.indexOf(parseConfig.endBlock)
      );
      var parts = [];
      var buffer = '';
      var bracket = '';
      var brackets = [ '\'', '"' ];
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
      return parts.length == 1 ? { lPart: parts[0] } : { lPart: parts[0], op: parts[1], rPart: parts[2] };
    }
}