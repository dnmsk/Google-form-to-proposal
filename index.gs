/*
  Process Google Form answers and apply them to Docs template file.
  Variables must be named like {Question name} in Form, symbols {} are necessary.
  Block can be marked as 'Hidable' by any conditions, with condition block: {if condition}Some text{/if}.
  Where condition are: Text == Text, 'Some Text' != 'Other text', 1 > 0.
  Question "Language" with Options: 'English', 'French' will switching templates.
  
  for questions 'Products' with checkboxes with checked values 'Product_1' and 'Product_2' will be:
  {option cost='300' name='Products' value='Product_1'}Product_1: {cost} €{/option} - render 'Product_2: 300 €'
  {option cost='600' name='Products' value='Product_2'}Product_2: {cost} €{/option} - render 'Product_2: 600 €' 
  {totalCost} - render '900'
*/

var settings = {
  docTemplateFiles: {
    'English': 'Копия _[2018_04_17] Proposition type_EN',
    'French': 'Копия _[2018_04_17] Proposition type_FR'
  },
  outputDriveFolder: 'Proposals'
}

function run() {
  new Form(settings)
    .applyResponsesToTemplate()
    .applyPriceOptions();
}
