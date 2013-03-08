Words = new Meteor.Collection("words");


if (Meteor.isClient) {
	Meteor.subscribe("words");
	
	var atTheMoment = function() {
		return new Date().getTime();
	}

	var getUserId = function() {
		return (Meteor.user() && Meteor.user()._id) || '';
	}

	/* time between repetition, in secs */
	var timings = [0, 30 * 60, 6 * 60 * 60, 20 * 60 * 60, 24 * 60 * 60,
	    24 * 60 * 60, 24 * 60 * 60, 24 * 60 * 60]

	var getNextWord = function() {
		var i, words;
		var nextTime = atTheMoment() + 1e9;
		for (i = 0; i < timings.length; ++i) {
			var timing = timings[i] * 1000;
			words = Words.find({user: getUserId(),
			       repeat_state: i, repeated_at: {$lt: atTheMoment() - timing}});
			if (words.count() > 0) {
				Session.set('next_word_period', undefined);
				return words.fetch()[_.random(words.count() - 1)];
			}
			words = Words.find({user: getUserId(),
				repeat_state: i}, {sort: {repeated_at: 1}});
			if (words.count() > 0) {
				nextTime = Math.min(nextTime,
					words.fetch()[0].repeated_at + timing);
			}
		}
		if (nextTime > atTheMoment() + 1e8) {
			Session.set('next_word_period', undefined);
		} else {
			Session.set('next_word_period',
				nextTime - atTheMoment());
		}
		return false;
	};
	Template.words_list.words = function () {
		return Words.find({user: getUserId()}, {limit: 100});
	}

	Template.words_list.dictionary_size = function() {
		return Words.find({user: getUserId()}).count();
	}

	Template.words_list.word_groups = function() {
		var i, result = [];
		for (i = 0; i < timings.length; ++i) {
			size = Words.find({user: getUserId(), repeat_state: i}).count();
			if (size > 0) {
				var group_size = size + (size > 1 ? ' words' : ' word');
				var repetitions = i + (i > 1 ? ' times' : ' time');
				result.push({group_size: group_size, repetitions: repetitions});
			}
		}	
		return result;
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

	var addWordWithDefaults = function(word_term, word_definition) {
		var now = atTheMoment();
		return Words.insert({user: getUserId(), word_term: word_term,
			word_definition: word_definition, created_at: now, repeated_at: now, repeat_state: 0});
	};

	var MINUTE_T = 60 * 1000;
	var HOUR_T = 60 * MINUTE_T;
	var DAY_T = 24 * HOUR_T;
	var getHumanViewForPeriod = function(period) {
		if (period > DAY_T) {
			return 'more than a day';
		} else if (period > HOUR_T) {
			var hours = Math.floor(period / HOUR_T);
			if (hours > 1) {
				hours = hours + ' hours';
			} else {
				hours = 'an hour';
			}
			return 'about ' + hours;
		} else if (period > MINUTE_T) {
			var minutes = Math.floor(period / MINUTE_T);
			if (minutes > 1) {
				return minutes + ' minutes';
			} else {
				return 'a minute';
			}
		} else {
			return 'less than a minute';
		}
	}

	var nextWordTimerHandler = function() {
		var period = Session.get('next_word_period');
		if (typeof period !== 'undefined') {
			Session.set('next_word_period', period - MINUTE_T);
		}
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
				var id = addWordWithDefaults(word, article);
				Session.set('added_definition', id);
				Session.set('quest', getNextWord());
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

	Template.exercise.quest_definition = function() {
		var quest = Session.get("quest") || getNextWord();
		Session.set("quest", quest);
		return quest;
	}

	Template.exercise.next_word_time = function() {
		var period = Session.get('next_word_period');
		if (typeof period !== 'undefined') {
			if (period > MINUTE_T) {
				setTimeout(nextWordTimerHandler, MINUTE_T);
			}
			period = 'in ' + getHumanViewForPeriod(period);
		}
		console.log("next word time: " + period);
		return period;
	}

	var statusShowedHandle = function(verdict) {
		console.log("handled");
		var quest = Session.get("quest");
		$('#variant_verdict').fadeOut();
		if (window.stored_verdict) {
			$('#variant').val('');
			Session.set("quest", undefined);
			Words.update({_id: quest._id}, {$inc: {repeat_state: 1}, $set: {repeated_at: atTheMoment()}});
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
		setTimeout(statusShowedHandle, 1000);
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
			console.log("verdict: " + verdict);
			console.log("variant: " + variant);
			console.log("word_term: " + quest.word_term);
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
		var admin = Meteor.users.findOne({"emails.address": "max.well44@yahoo.com"});
		var admin_id = (admin && admin._id) || '';
		Session.set("current_word", '');
		Words.allow({
			insert: function(userId, word) {
				return userId && userId === word.user;
			},
			remove: function(userId, words) {
				return (userId === admin_id) || _.all(words, function(word) {
					return userId === word.user;
				});
			},
			update: function(userId, words, fieldNames, modifier) {
				return (userId === admin_id) || _.all(words, function(word) {
					return userId == word.user;
				});
			}
		});
	});
}
