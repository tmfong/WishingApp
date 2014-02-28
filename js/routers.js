/* Routes */
App.Router.map(function() {
  this.resource('days', {path: '/days'});
});
App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('days');
  }
});
App.DaysRoute = Ember.Route.extend({
  model: function() {
    return this.get('store').findAll('day');
  },
  actions: {
    addingRecord: function() {
      var today = new Date();
      var day = Ember.Object.extend({
        dateString: moment(today).format('YYYY-MM-DD'),
        dateDisplay: function() {
          return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
            moment(this.get('dateString')).format('MMMM D, YYYY') : '';
        }.property('dateString'),
        dayOfWeek: function() {
          return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
            moment(this.get('dateString')).format('dddd') : '';
        }.property('dateString')       
      }).create();
      
      this.get('controller').set('currentDay', day);
      this.controllerFor("application").set('isAddingRecord', true);
    },    
    cancelAddingRecord: function() {
      console.log('>> DaysRoute cancelAdding');            
      this.controllerFor("application").set('isAddingRecord', false);
    },    
    save: function(obj) {
      /* ERROR: Must use Ember.set() to access this property
      obj.date = day;
      obj.a = obj.a || '';
      obj.b = obj.b || '';
      obj.c = obj.c || '';
      */
      var r = {
        //date: moment(obj.dateString).toDate() // For backward compatibility
        date: obj.dateString
        , a: obj.a || ''
        , b: obj.b || ''
        , c: obj.c || ''
      }
      //obj.daysSince1970 = Math.floor(day.getTime() / (24*60*60*1000));
      console.log('>> save', r);

      var record = this.get('store').createRecord('day', r);
      record.save();
      this.controllerFor("application").toggleProperty('isAddingRecord');     
    },

    update: function(model) {
      //var day = new Date(model.get('year'), model.get('month')-1, model.get('day'));
      model.set('date', model.get('dateString'));
      model.set('a', model.get('a') || '');
      model.set('b', model.get('b') || '');
      model.set('c', model.get('c') || '');      
      //model.set('daysSince1970', Math.floor(day.getTime() / (24*60*60*1000)));
      console.log('>> update', model);
      model.save();   
    },
    delete: function(day) {
      console.log('>> DaysRoute delete');      
      day.deleteRecord();
      day.save();
    },    

  }  
});


App.DayRecordComponent = Ember.Component.extend({
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');
    }, 
    update: function() {
      var r = this.get('record');
      this.sendAction('updateAction', r);
      this.toggleProperty('isEditing'); 
    },
    cancel: function() {
      console.log('>> DayRecordComponent cancel cancelAction=', this.get('cancelAction'))
      if (this.get('cancelAction')) {
        this.sendAction('cancelAction');
      } else {
        this.toggleProperty('isEditing');        
      } 
    },   
    delete: function() { 
      var r = this.get('record');
      console.log('>> DayRecordComponent delete', r.get('date'));
      this.sendAction('deleteAction', r);  
      this.toggleProperty('isEditing');    
    },
  }
});

App.ActionButtonsComponent = Ember.Component.extend({
  actions: {
    updateEdit: function() {
      this.sendAction('updateAction');
    },
    cancelEdit: function() {
      this.sendAction('cancelAction');
    },       
    confirmingDelete: function() {
      this.toggleProperty('isConfirmingDelete'); 
    },
    delete: function() {
      this.sendAction('deleteAction');      
      this.toggleProperty('isConfirmingDelete');
    },
    cancelDelete: function() {
      this.toggleProperty('isConfirmingDelete'); 
    },
  }
});