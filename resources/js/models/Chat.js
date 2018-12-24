Chat = function(data) {
    var self = this;

    var props = [
        {name: 'description'},
        {name: 'name'},
        {name: 'user_id'},
        {name: 'is_active', data_type: 'bool', placeholder: false},
    ];

    self.activeDataRelations = [
        {type: 'hasMany', model: 'Message'}
    ];

    ActiveData.call(self, data); //javascript 'classes' workaround
    self.activeDataInit(self, data, props); //setup active data
}