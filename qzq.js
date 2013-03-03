if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to qzq.";
  };

  var updateWordsList = function() {
	  words = Words.find().fetch();
	  dlist = "<dl>";
	  for (i = 0, len = words.length; i < len; ++i) {
		  dlist += "<dt>" + words[i].qz + "</dt>";
		  dlist += "<dd>" + words[i].ru + "</dd>";
	  }
	  dlist += "</dl>";
	  $('#words_list').html(dlist);
  }

  Template.hello.events({
    'click Click' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined') {
        console.log("You pressed the button");
	words = Words.find().fetch();
	ulist = "<ul>";
	console.log("Words length = " + words.length);
	for (i = 0, len = words.length; i < len; ++i) {
		ulist = ulist + "<li>" + words[i].en + "</li>";
	}
  	ulist = ulist + "</ul>"
	$('#words_list').html(ulist);
      }
    },
	  'click #submit_word_button' : function() {
		qz_word = $('#qzq_word').val();
		ru_word = $('#rus_word').val();
		if (qz_word.length == 0 || ru_word.length == 0) {
			console.log('Empty values. Not submitted.');
			return;
		}
		if (typeof console !== 'undefined') {
			console.log('Submitting of pair ' +
				qz_word + "->" + ru_word);
		}
		Words.insert({qz: qz_word, ru: ru_word, count: 0});
		updateWordsList();
	    }
  });
}

if (Meteor.isServer) {
	Meteor.startup(function () {
		// code to run on server at startup
		Words = new Meteor.Collection("words");
	});
}
