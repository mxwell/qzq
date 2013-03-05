Words = new Meteor.Collection("words");

Words.allow({
	insert: function(userId, word) {
		return userId && userId === word.user;
	},
	remove: function(userId, words) {
		return _.all(words, function(word) {
			return userId === word.user;
		});
	},
	update: function(userId, words, fieldNames, modifier) {
		/*return true;*/
		return _.all(words, function(word) {
			return userId == word.user;
		});
	}
});

var addWord = function(user, direction, word_term, word_definition) {
	var now = new Date().getTime();
	return Words.insert({user: user, direction: direction, word_term: word_term,
		word_definition: word_definition, created_at: now, repeat_at: now, repeat_state: 0});
}

var addKazakhWord = function(user, word_term, word_definition) {
	return addWord(user, "kz-ru", word_term, word_definition);
}

var addKazakhWordByTheUser = function(word_term, word_definition) {
	return addKazakhWord(Meteor.user()._id, word_term, word_definition);
}

var getUserId = function() {
	return (Meteor.user() && Meteor.user()._id) || '';
}

if (Meteor.isClient) {
	Meteor.subscribe("words");
	Template.words_list.words = function () {
		return Words.find({}, {limit: 10});
	}

	Template.new_word.definitions_list = function() {
		word = Session.get("current_word") || "";
		if (word.length == 0)
			return null;
		return Words.find({word_term: word});
	}

	Template.word_definition.selected = function() {
		return Session.equals('added_definition', this._id) ?
			'selected' : '';
	}

	Template.new_word.events({
		'click #find_word_button' : (function() {
			console.log("click add word");
			var word_term = $('#word_term').val();
			Session.set("current_word", word_term);
			Session.set('added_definition', '');
			$('#word_definition').focus();
		}),
		'click #add_new_definition' : (function() {
			console.log("click add new definition");
			word = Session.get('current_word');
			article = $('#word_definition').val();
			if (article.length == 0)
				return;
			collisions = Words.find({word_term: word,
				word_definition: article});
			if (collisions.count() == 0) {
				var id = addKazakhWordByTheUser(word, article);
				Session.set('added_definition', id);
			} else {
				Session.set('added_definition', collisions.fetch()[0]._id);
			}
			$('#word_term').val(word);
			$('#word_definition').val('');
			$('#word_term').focus();
		}),
		'click .remove_link' : (function() {
			console.log("click remove id: " + this._id);
			console.log("user id: " + Words.findOne(this._id).user);
			Words.remove({_id: this._id})
		}),
		'keyup #word_term' : (function(event) {
			if (event.keyCode == 13) {
				$('#find_word_button').click();
			}
		}),
		'keyup #word_definition' : (function(event) {
			if (event.keyCode == 13) {
				$('#add_new_definition').click();
			}
		})
	});

	var getNextWord = function() {
		var i, words;
		for (i = 0; i < 6; ++i) {
			words = Words.find({user: getUserId(), repeat_state: i});
			if (words.count() > 0) {
				return words.fetch()[_.random(words.count() - 1)];
			}
		}
		return Words.findOne({user: getUserId()});
	};

	Template.exercise.quest_definition = function() {
		var quest = getNextWord();
		Session.set("quest", quest);
		return quest;
	}

	var statusShowedHandle = function(verdict) {
		console.log("handled");
		var quest = Session.get("quest");
		$('#variant_verdict').fadeOut();
		if (window.stored_verdict) {
			$('#variant').val('');
			Session.set("quest", undefined);
			Words.update({_id: quest._id}, {$inc: {repeat_state: 1}});
		}
		window.stored_verdict = undefined;
	}

	var showStatus = function(verdict) {
		var status = $('#variant_verdict');
		if (verdict) {
			status.html('Ok');
			status.css('color', 'green');
			status.fadeIn();
		} else {
			status.html('Wrong');
			status.css('color', 'red');
			status.fadeIn();
		}
		window.stored_verdict = verdict;
		setTimeout(statusShowedHandle, 2200);
	}

	Template.exercise.events({
		'click #check_variant' : (function() {
			console.log("click check");
			if (typeof window.stored_verdict === 'Boolean') {
				return;
			}
			var variant = $('#variant').val();
			var quest = Session.get("quest");
			var verdict = (variant === quest.word_term);
			showStatus(verdict);
		}),
		'keyup #variant' : (function(event) {
			if (event.keyCode == 13) {
				$('#check_variant').click();
			}
		})
	});

}

if (Meteor.isServer) {
	Meteor.startup(function () {
		Session.set("current_word", '');
	});
}
