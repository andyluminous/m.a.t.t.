$(document).ready(() => {
  $('form').submit((event)=>{
    event.preventDefault();
    let formData = $('form').serializeArray()
    $.ajax({
      method: 'GET',  
      url: `/api/echoAtTime/${formData[0].value}/${formData[1].value}`
    }).done((data) => {
      if (!data.err) {
        $('#response-box').text('SUCCESS');
      } else {
        $('#response-box').text('ERROR: ' + data.err);
      }
      setTimeout(() => {
        $('#response-box').text('');
      }, 1000)
    });        
  })

});
