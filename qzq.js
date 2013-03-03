Words = new Meteor.Collection("words");

Words.allow({
	insert: function(userId, word) {
		return userId && userId === word.user;
	},
	remove: function(userId, words) {
		return _.all(words, function(word) {
			if (userId !== word.user)
				return false;
			return true;
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
}

if (Meteor.isServer) {
	Meteor.startup(function () {
		Session.set("current_word", '');
	});
}
