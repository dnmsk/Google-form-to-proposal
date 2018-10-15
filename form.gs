function Form(settings) {
  var form = FormApp.getActiveForm();
  var responses = undefined;
  var output = { doc: copyTemplate() };

  this.applyResponsesToTemplate = function(rowId) {
    responses = responses || readResponses(rowId);

    //var pdfBlob =
    new DocFormatter(output.doc)
      .applyConstValues(responses)
      .applyIfTags();
      //.asPdf();
    //output.pdf = DriveApp.createFile(pdfBlob);

    return this;
  }
  
  this.saveLinksToSpreadsheet = function() {
    return;
    var formDestinationId = form.getDestinationId();
    Logger.log(formDestinationId);
    var speadsheet = Spreadsheet.openById(formDestinationId);
    Logger.log(formDestinationId);
  }
  
  this.applyPriceOptions = function() {
    responses = responses || readResponses(rowId);

    new DocFormatter(output.doc)
      .applyConstValues(responses)
      .applyPriceOptions(responses);
    return this;
  }
  
  function getTemplateFile() {
    responses = responses || readResponses();
    var templateFileName = settings.docTemplateFiles[responses.Language] || settings.docTemplateFiles.English;
    return DriveApp.getFilesByName(templateFileName).next()
  }
  
  function copyTemplate() {
    var file = getTemplateFile();
    var newFileName = Utilities.formatString('%s %s', Utilities.formatDate(new Date(), 'Europe/France', 'yyyy-MM-dd'), responses.CORPORATE);
    var folder = file.getParents().next();
    var similarFolders = folder.getFoldersByName(settings.outputDriveFolder);
    var targetFolder = similarFolders.hasNext() ? similarFolders.next() : null;
    if (!targetFolder) {
      targetFolder = folder.createFolder(settings.outputDriveFolder);
    }
    var fileCopy = file.makeCopy(newFileName, targetFolder);
    var fileId = fileCopy.getId();
    return DocumentApp.openById(fileId);
  }
  
  function readResponses(rowId) {
    var formResponses = form.getResponses();
    var response = formResponses[rowId || formResponses.length - 1];

    var itemResponses = response.getItemResponses();
    var _responses = {};
    for (var i = 0; i < itemResponses.length; i++) {
      var itemResponse = itemResponses[i];
      _responses[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
    }
    return _responses;
  }
}
