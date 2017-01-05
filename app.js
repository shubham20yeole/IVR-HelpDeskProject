var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongodb = require('mongodb')
var mongojs = require('mongojs');
var routes = require('./routes/index');
var users = require('./routes/users');
var twilio = require('twilio');

var app = express();


// view engine setup
var db = mongojs('mongodb://pratik:pratik@ds133438.mlab.com:33438/heroku_9rvcpdq9', ['users','response','news']);

app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.get('/results', function(req, res)
{
   db.response.find().sort({response: -1},function(err, data) 
  {
        if (err) {
        throw err;
    } 
    else{

     console.log(data);
     res.json(data);

    }

  });


});

app.post('/voice', (request, response) => 
{
  var twiml = new twilio.TwimlResponse();
  twiml.gather({ 
    finishOnKey:'*',
    numDigits: 5,
    action: '/gather'
    
  }, 
  (gatherNode) => {
    gatherNode.say(' Please enter your 5 digit ID and then press star.');
  });
  twiml.redirect('/voice');

  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/gather', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  var twiml = new twilio.TwimlResponse();
  if(request.param('userid'))
  {
  var uid = request.param('userid');
  }
  else
  {
    var uid = request.body.Digits;
  }
   
   db.users.findOne({userid: uid }, function(err, data) 
                   
    {
     
  var name = data.name;
  if (data) {
    twiml.say('wellcome,'+data.name);

    twiml.gather({ 
    numDigits: 1,
    action: '/gather1?userid='+data.userid
    
  }, 
  (gatherNode) => {
    gatherNode.say('press 1 for course information, press 2 for grades, press 3 to take part in survey, press 4 for news and updates, press 5 to talk to our executive');
  });
  twiml.redirect('/voice');
 
  }
   else {
    twiml.redirect('/voice');
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
      });
});
app.post('/gather1', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  var twiml = new twilio.TwimlResponse();
  var id = request.param('userid');




  if(request.body.Digits)
  {

    switch (request.body.Digits) {
      case '1': 
      twiml.say('Hi there! Please speak your course number,for example cs 641 after the beep,-Get ready!')
        .record({
      transcribe:true,
      timeout:5,
      maxLength:30,
      transcribeCallback:'/transcribe',
      action:'/recording'


        })


break;
                
case '2':twiml.say('wellcome to couse grades!');
twiml.redirect('/grades?userid='+id);



break;


case '3':  twiml.say('Rate between 1 to 5, one being the lowest and five as highest, lets begin').pause();


twiml.gather({
  method:"post",
  numDigits:1,
  action:"/survey"

},
(gatherNode) => {
  gatherNode.say('How effective was the teaching in your major at this university?');
});


break;
case '4':  twiml.say('wellcome to daily news updates').pause();

twiml.redirect('/news?userid='+id);
break;


case '5': 
var twiml = new twilio.TwimlResponse();
twiml
.say('You\'ll be connected shortly connected.',
 { voice: 'alice', language: 'en-GB' })
.dial({ record:"true"}, function() {
  this.number('201-920-3362', {

  });
  this.number('551-263-6012', {

  });
   this.number('201-920-4433', {

  });

});
break;
default: 
twiml.say('Sorry, I don\'t understand that choice.').pause();
twiml.redirect('/voice');
break;
}



} 

else {
  twiml.redirect('/voice');
}

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});

app.post('/grades', (request,response) => {
var twiml = new twilio.TwimlResponse();

db.users.findOne({userid: request.param('userid')}, function(err, data) 
  {
  twiml.say("Your previous semester grades!").pause();
  twiml.say("1 "+data.prevcourses[0]).pause();
  twiml.say("your grade "+data.grades[0]).pause();
  twiml.say("2 "+data.prevcourses[1]).pause();
  twiml.say("your grade "+data.grades[1]).pause();
  twiml.say("3 "+data.prevcourses[2]).pause();
  twiml.say("your grade "+data.grades[2]).pause(
    {
      length:2
}
    );
  twiml.gather({
  timeout:5,
  method:"post",
  numDigits:1,
  action:"/gather?userid="+request.param('userid')

},
(gatherNode) => {
  gatherNode.say('Press 9 to go back to previous menu');
});
    response.type('text/xml');
  response.send(twiml.toString());

                });

  
});

app.post('/survey', (request,response) => {
var twiml = new twilio.TwimlResponse();
if(request.body.Digit!=0 && request.body.Digits <= 5 ){   
twiml.say('Thank you for your response good bye!').hangup();  
var accountSid = 'AC5b3a64ad844dfbb918812897bcf2a1ce'; 
var authToken = '8c055fe15f07533ff69388be72b93b16';  
var client = new twilio.RestClient(accountSid, authToken);

   
db.response.insert( { response: request.body.Digits  } );

   
client.messages.create({
    body: 'Thanks for participating in survey for survey result visit https://voiceresponse.herokuapp.com/',
    to: request.body.From,  
    from: '+16466528019' 
}, function(err) {
    console.log(err);
}
);
}
else{
   twiml.say('Invalid response try again!').hangup(); 
   
}
   
  response.type('text/xml');
  response.send(twiml.toString());
   
});
app.post('/news', (request,response) => {
var twiml = new twilio.TwimlResponse();

db.news.findOne(function(err, data) 
  {
  
  twiml.say(data.news);
  twiml.gather({
  timeout:5,
  method:"post",
  numDigits:1,
  action:"/gather?userid="+request.param('userid')

},
(gatherNode) => {
  gatherNode.say('Press 9 to go back to previous menu');
});
    response.type('text/xml');
  response.send(twiml.toString());

  });

});

app.post('/recording', (request,response) => {
  var twiml = new twilio.TwimlResponse();
  // A message for the user
     twiml.say('Please wait while we transcribe your answer.');

     twiml.redirect('/recording');

  response.type('text/xml');
  response.send(twiml.toString());
});
app.post('/transcribe', (request, response) => {
  var text = request.body.TranscriptionText;
  var callSid = request.body.CallSid;

  // Do something with the text
  var courseId =text;

  var accountSid = 'AC5b3a64ad844dfbb918812897bcf2a1ce'; 
    var authToken = '8c055fe15f07533ff69388be72b93b16';  
var client = require('twilio')(accountSid, authToken);

  // Redirect the call
  client.calls(callSid).update({
    url: '/course?courseId=' + courseId,
    method: 'POST'
  }, (err, res) => {
    response.sendStatus(200);
  })
});

app.post('/course', (request,response) => {
var twiml = new twilio.TwimlResponse();
    var courseId = request.param('courseId');

       
      twiml.say('hello'+courseId);
  response.type('text/xml');
  response.send(twiml.toString());

});


app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}


app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
