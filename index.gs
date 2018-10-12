/*
  Process Google Form answers and apply them to Docs template file.
  Variables must be named like {Question name} in Form, symbols {} are necessary.
  Block can be marked as 'Hidable' by any conditions, with condition block: {if condition}Some text{/if}.
  Where condition are: Text == Text, 'Some Text' != 'Other text', 1 > 0.
*/

var settings = {
  docTemplateFile: 'Копия _[2018_04_17] Proposition type_EN',
  outputDriveFolder: 'Proposals'
}

function run() {
  var form = FormApp.getActiveForm();
  var formResponses = form.getResponses();
  var response = formResponses[formResponses.length - 1];
  
  var itemResponses = response.getItemResponses();
  var responses = {};
  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    responses[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  }
  Logger.log(responses);

  var file = DriveApp.getFilesByName(settings.docTemplateFile).next();
  var newFileName = Utilities.formatString('%s %s %s', settings.docTemplateFile, responses.CORPORATE, Utilities.formatDate(new Date(), 'GMT', "yyyy-MM-dd HH:mm:ss"));
  var folder = file.getParents().next();
  var similarFolders = folder.getFoldersByName(settings.outputDriveFolder);
  var targetFolder = similarFolders.hasNext() ? similarFolders.next() : null;
  if (!targetFolder) {
    targetFolder = folder.createFolder(settings.outputDriveFolder);
  }
  var fileCopy = file.makeCopy(newFileName, targetFolder);
  var fileId = fileCopy.getId();
  var pdfBlob = new DocFormatter(DocumentApp.openById(fileId))
    .applyConstValues(responses)
    .applyIfTags()
    .asPdf();
  //DriveApp.createFile(pdfBlob);
}
