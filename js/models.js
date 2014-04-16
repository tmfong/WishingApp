
/* ***************************************************
 *
 * Constants 
 *
 */
var GAME_STARTER_FUND = 200;

var GAME_GOAL_INVESTMENT_LEVELS = [100, 200, 500, 1000, 10000];
var GAME_GOAL_1ST_ACTION_REWARD = 0.1;
var GAME_GOAL_ACTION_REWARD = 0.05;
var GAME_GOAL_MAX_ACTION_REWARD = 0.25;
var GAME_GOAL_DAILY_PENALTY = -0.3;

// Controller properties:
//    availableFundsVault: null,    
//    totalInvestmentsVault: null,  
//    lastCheckInDateVault: null,     
//    lastCheckInDay: null,   
var VAULT_TYPE_DAY = 'day';
var VAULT_LAST_CHECK_IN_DATE = 'lastCheckInDate';

var ACTION_INTERVAL_IN_HOURS = 6;

var DATE_NEVER = '2000-01-01';
var DATE_FUTURE = '2099-01-01';

/* ***************************************************
 *
 * Models 
 *
 */

 App.Day = DS.Model.extend({
  // Date
  //
  date: DS.attr(),
  // dateString is a proxy for safe editing
  dateString: function() {
    return this.get('date');
  }.property('date'),
  isToday: function() {
    return this.get('date') === todayDate();
  }.property('date'), 
  dateDisplay: function() {
    return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
      moment(this.get('dateString')).format('MMMM D, YYYY') : '';
  }.property('dateString'),
  dayOfWeek: function() {
    return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
      moment(this.get('dateString')).format('dddd') : '';
  }.property('dateString'),

  // Finance
  //  
  starterFunds: DS.attr(),  
  earnings: function() {
    var dailyGoals = this.get('dailyGoals').get('content');
    var rewards = 0;
    for (var i = 0; i < dailyGoals.length; i++) {
      rewards += dailyGoals[i].get('earnings');
    }
    return rewards;
  }.property('dailyGoals.@each.earnings'),

  expenses: DS.attr(),  // Funds converted to goal investments
  hasInvestments: function() {
    return this.get('expenses') > 0;
  }.property('expenses'),    

  totalInvestments: DS.attr(), 

  availableFunds: function() {
    return this.get('starterFunds') + 
      this.get('earnings') -
      this.get('expenses');    
  }.property('starterFunds', 'earnings', 'expenses'),

  totalAssets: function() {
    return this.get('totalInvestments') + 
      this.get('starterFunds') + 
      this.get('earnings');
  }.property('starterFunds', 'earnings', 'totalInvestments'),

  // Status
  //
  checkedIn: DS.attr(),

  notes: DS.hasMany('note'),
  dailyGoals: DS.hasMany('dailyGoal')
});

// Save to archive
App.Goal = DS.Model.extend({
  title: DS.attr(),
  body: DS.attr(),

  daily: DS.attr(),
  startDate: DS.attr(),
  endDate: DS.attr(),
  isCompleted: function() {
    return this.get('endDate') <= todayDate();
  }.property('endDate'), 

  investment: DS.attr(), 
  isInvested: function() {
    return this.get('investment') > 0;
  }.property('investment'),   

  dailyGoals: DS.hasMany('dailyGoal')
});

// Daily snapshots
App.DailyGoal = DS.Model.extend({
  goal: DS.belongsTo('goal'),
  day: DS.belongsTo('day'), 

  investment: DS.attr(),
  earnings: function() {
    var activities = this.get('activities').get('content');
    var rewards = 0;
    for (var i = 0; i < activities.length; i++) {
      rewards += activities[i].get('reward');
    }
    if (rewards === 0) {
      // A daily goal doesn't have penalty unless the day has passed
      var thisDate = this.get('day').get('date');
      if (thisDate < todayDate()) {
        rewards = this.get('investment') * GAME_GOAL_DAILY_PENALTY;        
      }
    }
    return rewards;
  }.property('activities.@each.reward'),

  isActive: function() {
    return this.get('investment') > 0;
  }.property('investment'), 

  activities: DS.hasMany('activity'),
});

App.Activity = DS.Model.extend({
  dailyGoal: DS.belongsTo('dailyGoal'),
  body: DS.attr(),
  reward: DS.attr(),
  actionAt: DS.attr(),
  createdAt: DS.attr()
});

App.Note = DS.Model.extend({
  day: DS.belongsTo('day'), 
  title: DS.attr(),  
  body: DS.attr(),
  tag: DS.attr(),  
  // tags: DS.hasMany('tag'),  
  editedAt: DS.attr()
});

// type: finance
App.Vault = DS.Model.extend({
  type: DS.attr(),
  key: DS.attr(),
  value: DS.attr(),
  editedAt: DS.attr()
});

// App.Tag =  DS.Model.extend({
//   notes: DS.hasMany('note'), 
//   tag: DS.attr()
// });

// App.NoteTag = DS.Model.extend({
//   note: DS.belongsTo('note'),
//   tag: DS.belongsTo('tag')
// });