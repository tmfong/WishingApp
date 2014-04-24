

/* ***************************************************
 *
 * Components 
 *
 */
App.ScoreCellComponent = Ember.Component.extend({
  style: function() {
    return currencyButtonCssClass(this.get('value'));
  }.property('value'),
  value: null,
  caption: null
});

/* ***************************************************
 *
 * Views 
 *
 */
App.GoalView = Ember.View.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('isNew'));
    this.set('isChanging', this.get('isEditing'));    
  },
  templateName: 'goal-record',  
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');
      this.toggleProperty('isChanging');       
    },    
    update: function(goal) {
      this.toggleProperty('isEditing');      
      this.toggleProperty('isChanging');

      this.sendAction('updateAction', goal); 
    },   

    investing: function() {
      this.toggleProperty('isInvesting');             
      this.toggleProperty('isChanging');       
    },
    invest: function(goal) {
      this.toggleProperty('isInvesting');      
      this.toggleProperty('isChanging');

      // Make sure we don't use string 
      var investment = parseInt(goal.get('investment'), 10);
      goal.set('investment', investment);

      this.sendAction('investAction', goal); 
    }, 
  }
});


App.DayView = Ember.View.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('isNew'));
  },
  templateName: 'day-record',

  earningsStyle: function() {
    return currencyButtonCssClass(this.get('earnings'));
  }.property('availableFunds'),
  availableFundsStyle: function() {
    return currencyButtonCssClass(this.get('availableFunds'));
  }.property('availableFunds'),
  expensesStyle: function() {
    return currencyButtonCssClass(this.get('expenses'));
  }.property('expenses'),

  actions: {

    update: function() {
      var r = this.get('record');
      this.sendAction('updateAction', r);

      this.toggleProperty('isEditing'); 
    },
    cancel: function() {
      var r = this.get('record');
      this.sendAction('cancelAction', r);     

      this.toggleProperty('isEditing');  
    },   
    delete: function() { 
      var r = this.get('record');
      console.log('>> DayRecordComponent delete', r.get('date'));
      this.sendAction('deleteAction', r);  

      this.toggleProperty('isEditing');    
    },

    //
    // Action activity
    //
    newActivityAction: function(action) {
      this.sendAction('newActivityAction', action);        
    },

    updateGoalAction: function(goal) {
      this.sendAction('updateGoalAction', goal);
    },

    //
    // Note
    //
    addingNote: function(day) {
      this.sendAction('newNoteAction', day); 

      this.toggleProperty('isNewNote');
    },
    updateNoteAction: function(note) {
      this.sendAction('updateNoteAction', note);

      if (this.get('isNewNote')) {
        this.toggleProperty('isNewNote');        
      }
    },    
  }
});

App.DailyGoalComponent = Ember.Component.extend({
  actions: {
    addingActivity: function(activity) {
      // ???
      // // If action is scheduled, save it for editing
      // if (!action) {
      //   var dailyGoal = this.get('dailyGoal');
      //   action = {
      //     goal: dailyGoal.get('goal'),
      //     day: dailyGoal.get('day'), 
      //     body: '',
      //     createdAt: '',
      //     actionAt: ''           
      //   }
      // } 
      this.set('clockStarts', new Date());
      this.set('newActivity', activity);

      this.toggleProperty('isAddingActivity');
    }, 

    addActivity: function(newActivity) {
      this.toggleProperty('isAddingActivity');

      var duration = moment().diff(this.get('clockStarts'), 'minutes');
      var clockStarts = this.get('clockStarts');

      // Ember Data
      if (!newActivity.get('body').trim()){
        if (duration < 1)  {
          newActivity.set('body', 'Check-in');
        } else {
          newActivity.set('body', moment().from(clockStarts, true));
        }
      }
      // // Smuggle dailyGoal for later use
      // newActivity.set('dailyGoal', this.get('dailyGoal'))           
      this.sendAction('newActivityAction', newActivity); 
    },     
  }
});

App.DailyNoteComponent = Ember.Component.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('note').get('isNew'));
  },  
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');   
    }, 

    update: function(note) {
      this.sendAction('updateNoteAction', note);
      this.toggleProperty('isEditing');       
    },

    confirmingCancel: function() {
      this.toggleProperty('isConfirmingCancel'); 
    },
    confirmedCancel: function(note) {    
      if (note.get('isNew')) {
        // Going to delete this newly created record
        note.set('body', '');
        this.sendAction('updateNoteAction', note);
      } else if (note.get('isDirty')) {
        note.rollback();
      }
      this.toggleProperty('isConfirmingCancel'); 
      this.toggleProperty('isEditing');            
    },  
    nevermind: function() {
      this.toggleProperty('isConfirmingCancel');       
    },    
  }
});

/* ***************************************************
 *
 * Controllers 
 *
 */

App.ApplicationController = Ember.Controller.extend({
  isEditing: false,
  
  checkedIn: function() {
    return this.get('lastCheckInDateVault') && 
      this.get('lastCheckInDateVault').get('value') === todayDate();
  }.property('lastCheckInDateVault'),

  totalInvestmentsStyle: function() {
    return currencyButtonCssClass(this.get('lastCheckInDay').get('totalInvestments'));
  }.property('lastCheckInDay.totalInvestments'),

  totalAssetsStyle: function() {
    return currencyButtonCssClass(this.get('lastCheckInDay').get('totalAssets'));
  }.property('lastCheckInDay.totalAssets'),

  // availableFundsVault: null,    
  // totalInvestmentsVault: null,  
  lastCheckInDateVault: null,  
  lastCheckInDay: null,      
});

App.DaysController = Ember.ArrayController.extend({
  needs: ['application'],
  // availableFundsVault: Ember.computed.alias('controllers.application.availableFundsVault'),
  // totalInvestmentsVault: Ember.computed.alias('controllers.application.totalInvestmentsVault'),
  // lastCheckInDateVault: Ember.computed.alias('controllers.application.lastCheckInDateVault'),

  sortProperties: ['date'],
  sortAscending: false
});

App.GoalsController = Ember.ArrayController.extend({
  needs: ['application'],
  // availableFundsVault: Ember.computed.alias('controllers.application.availableFundsVault'),
  // totalInvestmentsVault: Ember.computed.alias('controllers.application.totalInvestmentsVault'),
  // lastCheckInDateVault: Ember.computed.alias('controllers.application.lastCheckInDateVault'),
});
