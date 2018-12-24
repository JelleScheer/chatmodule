Message = function(data) {
    var self = this;

    var props = [
        {name: 'body'},
    ];

    self.activeDataRelations = [
        {type: 'belongsTo', model: 'Chat'}
    ];

    ActiveData.call(self, data); //javascript 'classes' workaround
    self.activeDataInit(self, data, props); //setup active data
}