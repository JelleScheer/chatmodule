/* Version 0.3.1 */

window.ActiveData = function() {
    var self = this;

    self.props = []; //properties set by resource
    self.reserved_prop_names = ['id', 'uid', 'objType', 'plural', 'activeDataRelations', 'relationsSyncedTimestamp', 'Store']; //reserved, cannot be set through props

    //setup all active data
    self.activeDataInit = function(obj, data, props) {
        //check if we have supplied a supplied a specific Store
        if(typeof(obj.Store) === 'undefined') {
            self.Store = window.Store;
        } else {
            self.Store = obj.Store;
        }

        self.id = parseInt(data.id);

        //check whether an uid is supplied or should be generated
        if(typeof(data.uid) !== 'undefined') {
            self.uid = parseInt(data.uid);
        } else {
            self.uid = ActiveDataStore.getNewUid();
        }

        //set negative id's for new objects
        if(isNaN(self.id)) {
            self.id = -self.uid;
        }

        self.objType = obj.constructor.name; //used in debugging AND in backend for data validation
        self.isChanged = data.isChanged || false; //used for deciding if this object needs to get synced when updating data
        self.is_deleted = data.is_deleted || false;
        self.updated_at = data.updated_at;
        self.created_at = data.created_at;
        self.relationsSyncedTimestamp = 0;
        self.replicated_from_id = data.replicated_from_id || false;
        self.uuid = data.uuid || ActiveDataStore.getNewUuid();
        self.activeDataPlural = ActiveDataStore.pluralize(self.objType);
        self.active_data_default_module = self.active_data_default_module || false;

        //set properties
        self.setProps(data, props);

        self.plural = ActiveDataStore.pluralize(self.objType);

        //if resource has defined a custom setup, call it
        if(typeof self.activeDataCustomSetup === 'function')
        {
            self.activeDataCustomSetup(data);
        }

        //set auto resource url unless already defined
        if(typeof self.active_data_sub_path === 'undefined')
        {
            self.active_data_sub_path = ActiveDataStore.pluralize(self.objType);
        }

        self.checkPagesContentOptions();

        self.setRelations();
    };

    //called after loading all resources in store, used for after load bindings.
    self.checkDataAfterLoad = function(storeData) {
        if(typeof self.activeDataAfterLoad === 'function')
        {
            self.activeDataAfterLoad(storeData);
        }
    };

    self.checkPagesContentOptions = function() {
        self.content_options = {};

        if(typeof(self.content_options_list) !== 'undefined') {
            //check if this object called a parent class
            if(typeof(self.parent_object_type) !== 'undefined') {
                var plural = ActiveDataStore.pluralize(self.parent_object_type);
            } else {
                var plural = ActiveDataStore.pluralize(self.objType);
            }

            var storage_path = 'active_data_content_options.' + plural;

            //set object attributes
            _.each(self.content_options_list, function(content_option) {
                if(typeof(content_option.name_clean) === 'undefined') {
                    console.log("%c" + 'Active Data debug warning: checkPagesContentOptions has a undefined name_clean, set a name_clean in the option_list', "color: #f48641");
                }
                else {
                    self.content_options[content_option.name_clean] = function(options = {}) {
                        var result = self.Store.getters.activeDataFindFirst(storage_path, self.id, 'parent_id', 'instance', false, options);

                        //if it doesn't exist yet, create it
                        if(result === false) {
                            if(typeof(content_option.placeholder) !== 'undefined') {
                                var content_option_data = content_option.placeholder;
                            } else {
                                var content_option_data = '';
                            }

                            var active_data_content_option = new ActiveDataContentOption({
                                name_clean: content_option.name_clean,
                                data_type: content_option.data_type,
                                parent_id: self.id,
                                model_type: self.objType,
                                data: content_option_data,
                            });

                            ActiveDataStore.activeDataCommitResource(window.ActiveDataContentOption, false, storage_path, active_data_content_option);
                            var result = Store.getters.activeDataFindFirst(storage_path, active_data_content_option.id, 'id', 'object');
                        }
                        return result;
                    };
                }
            });

            self.active_data_content_options = function(options = {}) {
                return self.Store.getters.activeDataFind(storage_path, self.id, 'parent_id', false, options);
            };
        } else {
            self.active_data_content_options = function() {return []};
        }
    }

    //loop through supplied properties and set them
    self.setProps = function(data, props) {
        if(_.isArray(props) && props.length > 0) {
            _.each(props, function(prop) {
                self.setProp(prop, data[prop.name]);
            });
        }

        //set any active data relation keys and storages so vue can track them
        if(typeof self.activeDataRelations === 'object')
        {
            _.each(self.activeDataRelations, function(relation) {
                //if no explicit key and model have been set, abort
                if(typeof relation.key === 'undefined' && typeof relation.model === 'undefined') {
                    console.log("%c" + 'Active Data debug warning: relation.key and relation.model both not set for ' + self.objType + "'s relation", "color: #f48641");
                    return;
                }

                if(typeof relation.key !== 'undefined') {
                    var key = relation.key;
                }

                if(typeof(relation.storage) === 'undefined') {
                    var storage = ActiveDataStore.pluralize(relation.model);
                } else {
                    var storage = relation.storage;
                }

                switch(relation.type) {
                    case 'belongsTo':
                        if(typeof relation.key === 'undefined') {
                            var key = ActiveDataStore.singulize(relation.model) + '_id';
                        }

                        self.setProp({name: key, data_type: 'int', save: true}, data[key]); //add relation key as prop, e.g.: website_id
                        self.setProp({name: storage, data_type: 'bool'}, false);

                        //check if synonym is set
                        if(typeof relation.synonym !== 'undefined') {
                            self.setProp({name: relation.synonym, data_type: 'bool'}, false);
                        }
                        break;
                    case 'hasOne':
                        self.setProp({name: storage, data_type: 'bool'}, false);

                        //check if synonym is set
                        if(typeof relation.synonym !== 'undefined') {
                            self.setProp({name: relation.synonym, data_type: 'bool'}, false);
                        }
                        break;
                    case 'hasMany':
                        self.setProp({name: storage, data_type: 'array'}, []);

                        //check if synonym is set
                        if(typeof relation.synonym !== 'undefined') {
                            self.setProp({name: relation.synonym, data_type: 'array'}, []);
                        }
                        break;
                    case 'hasManyThrough':
                        self.setProp({name: storage, data_type: 'array'}, []);

                        //check if synonym is set
                        if(typeof relation.synonym !== 'undefined') {
                            self.setProp({name: relation.synonym, data_type: 'array'}, []);
                        }
                        break;
                }
            });
        }
    };

    self.setRelations = function() {
        if(typeof self.activeDataRelations === 'object')
        {
            _.each(self.activeDataRelations, function(relation) {
                //check if we are targeting any store module
                if(typeof(relation.module) === 'undefined') {
                    relation.module = false;
                }

                //check if explicit storage has been set, otherwise use model
                if(typeof relation.storage !== 'undefined') {
                    var default_storage = relation.storage;

                } else if(typeof relation.model !== 'undefined'){
                    switch(relation.type) {
                        case 'belongsTo':
                            var default_storage = ActiveDataStore.singulize(relation.model);
                        case 'hasOne':
                            var default_storage = ActiveDataStore.singulize(relation.model);
                            break;
                        case 'hasMany':
                            var default_storage = ActiveDataStore.pluralize(relation.model);
                            break;
                        case 'hasManyThrough':
                            var default_storage = ActiveDataStore.pluralize(relation.model);
                            break;
                    }
                } else {
                    console.log("%c" + 'Active Data debug warning: relation.storage and relation.model both not set for ' + self.objType + "'s relation", "color: #f48641");
                    return;
                }

                var relation_storages = [default_storage];

                //check if synonym is set
                if(typeof relation.synonym !== 'undefined') {
                    relation_storages.push(relation.synonym);
                }

                //check if explicit storeTarget has been set to locate data set in store, otherwise use model
                if(typeof relation.storeTarget !== 'undefined') {
                    var store_target = relation.storeTarget;
                } else if(typeof relation.model !== 'undefined'){
                    var store_target = ActiveDataStore.pluralize(relation.model);
                } else {
                    console.log("%c" + 'Active Data debug warning: relation.storeTarget and relation.model both not set for ' + self.objType + "'s relation", "color: #f48641");
                    return;
                }

                //if no explicit key and model have been set, abort
                if(typeof relation.key === 'undefined' && typeof relation.model === 'undefined') {
                    console.log("%c" + 'Active Data debug warning: relation.key and relation.model both not set for ' + self.objType + "'s relation", "color: #f48641");
                    return;
                }

                if(typeof relation.key !== 'undefined') {
                    var key = relation.key;
                }

                switch(relation.type) {
                    case 'belongsTo':
                        if(typeof relation.key === 'undefined') {
                            var key = ActiveDataStore.singulize(relation.model) + '_id';
                        }

                        _.each(relation_storages, function(relation_storage) {
                            self[relation_storage] = function(options = {}) {
                                return self.Store.getters.activeDataFindFirst(store_target, self[key], 'id', 'instance', relation.module, options);
                            };
                        });
                        break;
                    case 'hasOne':
                        if(typeof relation.key === 'undefined') {
                            var key = ActiveDataStore.singulize(self.objType) + '_id';
                        }

                        _.each(relation_storages, function(relation_storage) {
                            self[relation_storage] = function(options = {}) {
                                return self.Store.getters.activeDataFindFirst(store_target, self.id, key, 'instance', relation.module, options);
                            };
                        });
                        break;
                    case 'hasMany':
                        if(typeof relation.key === 'undefined') {
                            var key = ActiveDataStore.singulize(self.objType) + '_id';
                        }

                        _.each(relation_storages, function(relation_storage) {
                            self[relation_storage] = function(options = {}) {
                                return self.Store.getters.activeDataFind(store_target, self.id, key, relation.module, options);
                            }
                        });
                        break;
                    case 'hasManyThrough':
                        if(typeof relation.key === 'undefined') {
                            var key = ActiveDataStore.singulize(relation.model) + '_id';
                        }

                        var relation_data = _.find(self.activeDataRelations, function(o) { return o.model === relation.through_model; });

                        if(relation_data.type === 'belongsTo') {
                            var through_model_store_target = ActiveDataStore.singulize(relation.through_model);
                        } else {
                            var through_model_store_target = ActiveDataStore.pluralize(relation.through_model);
                        }

                        /*if(typeof relation.through_model_key === 'undefined') {
                            var through_key = ActiveDataStore.singulize(through_model_store_target) + '_id';
                        } else {
                            var through_key = relation.through_model_key;
                        }*/

                        _.each(relation_storages, function(relation_storage) {
                            self[relation_storage] = function(options = {}) {
                                var results = [];

                                if(relation_data.type === 'belongsTo') {
                                    //check if our through model has our target as hasMany or hasManyThrough, if it does we will have to loop
                                    if(self[through_model_store_target]()[default_storage] !== false && Array.isArray(self[through_model_store_target]()[default_storage]())) {
                                        _.each(self[through_model_store_target]()[default_storage](), function(through_instance) {
                                            results.push(through_instance);
                                        });
                                    } else {
                                        var lookup = self.Store.getters.activeDataFind(store_target, self[through_model_store_target]()[key], 'id', relation.module, options);
                                        results = results.concat(lookup);
                                    }
                                } else {
                                    _.each(self[through_model_store_target](), function(through_model_instance) {
                                        //check if our through model has our target as hasMany or hasManyThrough, if it does we will have to loop
                                        if(through_model_instance[default_storage] !== false && Array.isArray(through_model_instance[default_storage]())) {
                                            _.each(through_model_instance[default_storage](), function(through_instance) {
                                                results.push(through_instance);
                                            });
                                        } else {
                                            var lookup = self.Store.getters.activeDataFind(store_target, through_model_instance[key], 'id', relation.module, options);
                                            results = results.concat(lookup);
                                        }
                                    });
                                }

                                results = _.uniqBy(results, 'uid');

                                return results;
                            }
                        });
                        break;
                }
            });
        }
    };

    //set a prop (targeting the resource so vue updates properly)
    self.setProp = function(prop, data) {
        if(!_.includes(self.reserved_prop_names, prop.name)) { //add if not in reserved list
            self.props.push(prop);
        } else {
            console.log("%c" + 'Active Data debug warning: prop name ' + prop.name + ' cannot be set, prop name is reserved ActiveData prop name.', "color: #f48641");
            return;
        }

        if (typeof data === "undefined" || data === null) {
            if(typeof prop.placeholder !== 'undefined') {
                data = prop.placeholder;
            } else {
                data = false;
            }
        }

        switch(prop.data_type) {
            case 'int':
                data = parseInt(data);
                break;
            case 'string':
                if(data === false) {
                    data = '';
                }
                data = String(data);
                if(!data) {
                    data = '';
                }
                break;
            case 'array':
                if(data === false) {
                    data = [];
                }
                break;
            case 'object':
                if(data === false) {
                    data = {};
                }
                break;
            case 'decimal':
                if(data === false) {
                    data = 0.00;
                }
                data = Number(data).toFixed(2);
                break
            case 'json':
                if(typeof(data) === 'string' && data && data.length > 0) {
                    data = JSON.parse(data);
                }
                break
            case 'bool':
                if(data !== false) {
                    if(data === true || parseInt(data) === 1) {
                        data = true;
                    } else {
                        data = false;
                    }
                }
                break;
            default: //string
                if(data === false) {
                    data = '';
                }
                data = String(data);
                if(!data) {
                    data = '';
                }
                break;
        }

        self[prop.name] = data;
    };

    //returns whether the record is new/unsaved
    self.isNew = function() {
        if(!isNaN(self.id) && parseInt(self.id) > 0) {
            return false;
        }  else {
            return true;
        }
    };

    //gather data object for saving to the backend
    self.getDataForSave = function() {
        var self = this;
        var results = {};

        //gather default active data props
        if(typeof(self.id) !== 'undefined' && !isNaN(self.id) && self.id > 0) {
            results.id = self.id
        }

        results.uid = self.uid;
        results.uuid = self.uuid;
        results.objType = self.objType;
        results.is_deleted = self.is_deleted;
        results.replicated_from_id = self.replicated_from_id;

        //gather supplied props on init
        _.each(self.props, function(prop) {
            if(prop.save === true) { //only save props marked to be saved
                results[prop.name] = self[prop.name];
            }
        });

        //if resource has defined a custom save, call it
        if(typeof self.activeDataCustomGetDataForSave === 'function')
        {
            results = self.activeDataCustomGetDataForSave(results);
        }

        //check if we need to add any relation data to the results as well
        if(typeof self.activeDataRelations !== 'undefined') {
            _.each(self.activeDataRelations, function(relation) {
                if(typeof relation.save !== 'undefined' && relation.save === true) {
                    if(relation.type === 'hasMany') {
                        var plural = ActiveDataStore.pluralize(relation.model);

                        if(typeof(relation.storage) === 'undefined') {
                            relation.storage = plural;
                        }

                        if(typeof(relation.storeTarget) === 'undefined') {
                            relation.storeTarget = plural;
                        }

                        if(typeof relation.key === 'undefined') {
                            relation.key = ActiveDataStore.singulize(self.objType) + '_id';
                        }

                        if(typeof(relation.module) === 'undefined') {
                            relation.module = false;
                        }

                        results[relation.storage] = [];
                        _.each(self.Store.getters.activeDataFind(relation.storeTarget, self.id, relation.key, relation.module, {filters: 'show_all'}), function(relation_instance) {
                            results[relation.storage].push(relation_instance.getDataForSave());
                        });
                    }

                    if(relation.type === 'belongsTo') {
                        var plural = ActiveDataStore.pluralize(relation.model);
                        var single = ActiveDataStore.singulize(relation.model);

                        if(typeof(relation.storage) === 'undefined') {
                            var storage = single;
                        } else {
                            var storage = relation.storage;
                        }

                        if(typeof(relation.storeTarget) === 'undefined') {
                            var store_target = plural;
                        } else {
                            var store_target = relation.storeTarget;
                        }

                        if(typeof relation.key === 'undefined') {
                            var key = ActiveDataStore.singulize(relation.model) + '_id';
                        } else {
                            var key = relation.key;
                        }

                        if(typeof(relation.module) === 'undefined') {
                            var module = false;
                        } else {
                            var module = relation.module;
                        }

                        results[storage] = self.Store.getters.activeDataFindFirst(store_target, self[key], single + '_id', 'instance', module, {filters: 'show_all'});
                    }
                }
            });
        }

        if(typeof(self.content_options_list) !== 'undefined') {
            if(typeof(self.parent_object_type) !== 'undefined') {
                var plural = ActiveDataStore.pluralize(self.parent_object_type);
            } else {
                var plural = ActiveDataStore.pluralize(self.objType);
            }

            results.active_data_content_options = {};
            results.active_data_content_options_list = [];


            var active_data_content_options_storage_path = 'active_data_content_options.' + plural;

            _.each(self.active_data_content_options(), function(active_data_content_option) {
                var data = active_data_content_option.getDataForSave();

                results.active_data_content_options[active_data_content_option.name] = data;
                results.active_data_content_options_list.push(data);
            });
        }

        return results;
    };

    self.create = function(options = {}) {
        var submit_url = '';

        //check if specific path given
        if(typeof(options.submit_path) !== 'undefined') {
            submit_url = options.submit_path;
        } else if(typeof(self.active_data_create_path) === 'function') {
            //else, check if object has update path defined
            submit_url = self.active_data_create_path();
        } else {
            //else, fall back to default
            if(typeof(self.active_data_base_path) !== 'undefined') {
                submit_url = self.active_data_base_path + '/';
            }
            submit_url = submit_url + self.active_data_sub_path + '/' + self.id + '/update';
        }

        //check if success_bacllback has been set
        if(typeof(options.success_callback) !== 'undefined') {
            var success_callback = options.success_callback;
        } else {
            var success_callback = function(response) {};
        }

        //check if failure has been set
        if(typeof(options.success_callback) !== 'undefined') {
            var failure_callback = options.failure_callback;
        } else {
            var failure_callback = function(response) {};
        }

        //check if toaster has been set
        if(typeof(options.toaster) !== 'undefined') {
            var toaster = options.toaster;
        } else {
            var toaster = {title: '', type: 'saving'};
        }

        //check if specific save dat has been supplied
        if(typeof(options.save_data) !== 'undefined') {
            var save_data = options.save_data;
        } else {
            var save_data = self.getDataForSave();
        }

        //check if specific module dat has been supplied
        if(typeof(options.module) !== 'undefined') {
            var module = options.module;
        } else if(typeof(self.active_data_default_module) !== 'undefined') {
            var module = self.active_data_default_module;
        } else {
            var module = false;
        }

        Store.dispatch(
            {
                type: 'activeDataAction',
                data: {
                    model: self.objType,
                    crud_method: 'create',
                    sub_path: submit_url,
                    save_data: save_data,
                    submit_type: 'create_' + ActiveDataStore.singulize(self.objType),
                    module: module,
                    success_callback: function(response){success_callback(response)},
                    failure_callback: function(response){failure_callback(response)},
                    toaster: toaster
                }
            }
        )
    };

    self.update = function(options = {}) {
        var submit_url = '';

        //check if specific path given
        if(typeof(options.submit_path) !== 'undefined') {
            submit_url = options.submit_path;
        } else if(typeof(self.active_data_update_path) === 'function') {
            //else, check if object has update path defined
            submit_url = self.active_data_update_path();
        } else {
            //else, fall back to default
            if(typeof(self.active_data_base_path) !== 'undefined') {
                submit_url = self.active_data_base_path + '/';
            }
            submit_url = submit_url + self.active_data_sub_path + '/' + self.id + '/update';
        }

        //check if success_bacllback has been set
        if(typeof(options.success_callback) !== 'undefined') {
            var success_callback = options.success_callback;
        } else {
            var success_callback = function(response) {};
        }

        //check if failure has been set
        if(typeof(options.success_callback) !== 'undefined') {
            var failure_callback = options.failure_callback;
        } else {
            var failure_callback = function(response) {};
        }

        //check if toaster has been set
        if(typeof(options.toaster) !== 'undefined') {
            var toaster = options.toaster;
        } else {
            var toaster = {title: '', type: 'saving'};
        }

        //check if specific save dat has been supplied
        if(typeof(options.save_data) !== 'undefined') {
            var save_data = options.save_data;
        } else {
            var save_data = self.getDataForSave();
        }

        //check if specific module dat has been supplied
        if(typeof(options.module) !== 'undefined') {
            var module = options.module;
        } else if(typeof(self.active_data_default_module) !== 'undefined') {
            var module = self.active_data_default_module;
        } else {
            var module = false;
        }

        Store.dispatch(
            {
                type: 'activeDataAction',
                data: {
                    model: self.objType,
                    crud_method: 'update',
                    sub_path: submit_url,
                    save_data: save_data,
                    submit_type: 'update_' + ActiveDataStore.singulize(self.objType),
                    module: module,
                    success_callback: function(response){success_callback(response)},
                    failure_callback: function(response){failure_callback(response)},
                    toaster: toaster
                }
            }
        )
    };

    self.delete = function(options = {}) {
        if(typeof(options.storage) === 'undefined') {
            options.storage = ActiveDataStore.pluralize(self.objType);
        }

        if(typeof(options.module) === 'undefined')
        {
            options.module = false;
        }

        if(typeof(options.cascade_delete !== 'undefined') && options.cascade_delete === true) {
            _.each(self.activeDataRelations, function(relation) {
                switch(relation.type) {
                    case 'hasMany':
                        if(typeof(relation.storage) === 'undefined') {
                            relation.storage = ActiveDataStore.pluralize(relation.model);
                        }

                        if(typeof relation.key === 'undefined') {
                            relation.key = ActiveDataStore.singulize(self.objType) + '_id';
                        }

                        if(typeof relation.module === 'undefined') {
                            relation.module = false;
                        }

                        _.each(self[relation.storage](), function(instance) {
                            Store.commit('removeActiveDataInstance', {collection: relation.storage, value: instance.uid, key: 'uid', module: options.module});
                        });
                        break;
                }
            });
        }

        Store.commit('removeActiveDataInstance', {collection: options.storage, value: self.uid, key: 'uid', module: options.module});
    };

    //returns a replicated version. checks if the object has a custom replicate function defined. if it has, it will call it so the object can do a custom replication setup;
    self.replicate = function(options = {}) {
        //get basic data and reset id/is_deleted (new uid is auto set by creating a new active data object)
        var replicate = self.getDataForSave();
        replicate = new window[self.objType](replicate);
        replicate.uid = ActiveDataStore.getNewUid();
        replicate.id = -replicate.uid; //set negative uid as id

        replicate.replicated_from_id = self.id;

        replicate.is_deleted = false;

        //check if custom cloning function is defined, call it if it is
        if(typeof(self.customReplicate) === 'function') {
            replicate = self.customReplicate(replicate);
        }

        if(typeof(options.storage) === 'undefined') {
            var storage = ActiveDataStore.pluralize(self.objType);
        } else {
            var storage = options.storage;
        }

        if(typeof(options.module) === 'undefined') {
            var module = false;
        } else {
            var module = options.module;
        }

        if(typeof(options.local_only) !== 'undefined' && options.local_only === true) {
            return replicate;
        }

        ActiveDataStore.activeDataCommitResource(window[self.objType], module, storage, replicate);
        var result = Store.getters.activeDataFindFirst(storage, replicate.id, 'id', 'object', module);

        //replicate relations if option is set
        if(typeof(options.clone_relations !== 'undefined') && options.clone_relations === true) {
            _.each(self.activeDataRelations, function(relation) {
                switch(relation.type) {
                    case 'hasMany':
                        if(typeof(relation.storage) === 'undefined') {
                            relation.storage = ActiveDataStore.pluralize(relation.model);
                        }

                        if(typeof relation.module === 'undefined') {
                            relation.module = false;
                        }

                        if(typeof relation.key === 'undefined') {
                            relation.key = ActiveDataStore.singulize(self.objType) + '_id';
                        }

                        _.each(self[relation.storage](), function(instance) {
                            var instance_copy = instance.replicate(options);

                            //lookup the newly created copy
                            instance_copy = Store.getters.activeDataFindFirst(relation.storage, instance_copy.uid, 'uid', 'object', module);

                            //adjust its key
                            instance_copy[relation.key] = replicate.id;
                        });
                        break;
                }
            });
        }

        if(typeof(self.content_options_list) !== 'undefined') {
            if(typeof(self.parent_object_type) !== 'undefined') {
                var plural = ActiveDataStore.pluralize(self.parent_object_type);
            } else {
                var plural = ActiveDataStore.pluralize(self.objType);
            }

            var active_data_content_options_storage_path = 'active_data_content_options.' + plural;

            _.each(self.active_data_content_options(), function(active_data_content_option) {
                var replicate_options = JSON.parse(JSON.stringify(options));
                replicate_options.storage = active_data_content_options_storage_path;
                replicate_options.module = false;

                var instance_copy = active_data_content_option.replicate(replicate_options);

                //lookup the newly created copy
                instance_copy = Store.getters.activeDataFindFirst(replicate_options.storage, instance_copy.uid, 'uid', 'object', false);
                instance_copy.data = active_data_content_option.data;

                //adjust its key
                instance_copy.parent_id = replicate.id;
            });
        }

        return replicate;
    };

    //sync data fetched from remote
    self.activeDataSync = function(data, storeData, options = {}) {
        for (var key in data) {
            if (data.hasOwnProperty(key) && !_.isFunction(self[key])) {
                var prop_match = _.find(self.props, function(o) { return o.name === key; });

                if(typeof(prop_match) !== 'undefined') {
                    self.setProp(prop_match, data[key]);
                }
            }
        }

        //check if we had a negative id and a new one is supplied
        if(typeof data.id !== 'undefined' && parseInt(self.id) < 0) {
            self.id = data.id;
        }

        if(typeof(options.nested_sync) !== 'undefined' && options.nested_sync === true) {
            _.each(self.activeDataRelations, function(relation) {
                switch(relation.type) {
                    case 'hasMany':
                        if(typeof(relation.storage) === 'undefined') {
                            relation.storage = ActiveDataStore.pluralize(relation.model);
                        }

                        if(typeof relation.module === 'undefined') {
                            relation.module = false;
                        }

                        if(typeof relation.key === 'undefined') {
                            relation.key = ActiveDataStore.singulize(self.objType) + '_id';
                        }

                        if(typeof(data[relation.storage]) !== 'undefined') {
                            //imu_todo: refactor loop below
                            _.each(self[relation.storage](), function(relation_instance) {
                                var data_instance = _.find(data[relation.storage], function(o) { return o.uid === relation_instance.uid; });

                                if(typeof(data_instance) !== 'undefined') {
                                    relation_instance.activeDataSync(data_instance, storeData, options);
                                }
                            });
                        }
                        break;
                }
            });
        }
        self.checkDataCustomSetupAR(storeData);
    }
};

window.ActiveDataStore = function(global_store = false) {
    var self = this;

    //check if we have supplied a supplied a specific Store
    if(global_store === false) {
        self.Store = window.Store;
    } else {
        self.Store = global_store;
    }

    self.hooks = [];
    self.loaded_active_data_models = []; //hold strings of Models we've loaded, used to sync relations later in the process
    self.relationsSyncedTimestamp = false; //used to prevent relations from loop syncing each other forever

    self.uid = 0;

    self.getNewUid = function() {
        self.uid += 1;
        return self.uid;
    }

    self.getNewUuid = function(a) {
        //from https://gist.github.com/jed/982883

        return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,self.getNewUuid);
    }

    self.pluralize = function(string) {
        //make lower case, hyphen splitted version of string. e.g. ServerGroup = server_group
        var sanitized_string = string.split(/(?=[A-Z])/).join('_').toLowerCase();

        //return pluralized version, using the pluralize js lib
        return pluralize(sanitized_string);
    }

    self.singulize = function(string) {
        //make lower case, hyphen splitted version of string. e.g. ServerGroup = server_group
        var sanitized_string = string.split(/(?=[A-Z])/).join('_').toLowerCase();

        //return singular version, using the pluralize js lib
        return pluralize.singular(sanitized_string);
    }

    //eg 'forge_popups' will return 'ForgePopup'
    self.toModel = function(string) {
        var result = pluralize.singular(string);
        result = result.replace(/(\_[a-z])/g, function($1){return $1.toUpperCase().replace('_','');});
        result = result.charAt(0).toUpperCase() + result.substr(1); //capitalize first letter

        return result;
    };

    self.getNewPosition = function(resource, key = 'position') {
        var new_position = _.maxBy(resource, key);

        if(typeof new_position === 'undefined') {
            new_position = 0;
        } else {
            new_position = new_position.position + 1;
        }

        return new_position;
    }

    self.activeDataSetup = function(active_data_models, data) {
        //check if data set is present

        _.each(active_data_models, function(active_data_model) {
            var plural = self.pluralize(active_data_model.model);

            if(typeof(active_data_model.chunk) === 'undefined') {
                active_data_model.chunk = false;
            }

            if(typeof(active_data_model.module) === 'undefined') {
                active_data_model.module = false;
            }

            if(typeof(active_data_model.storage) === 'undefined') {
                active_data_model.storage = plural;
            }

            if(typeof(active_data_model.source) === 'undefined') {
                active_data_model.source = plural;
            }

            if(typeof(active_data_model.nested_models) === 'undefined') {
                active_data_model.nested_models = false;
            }

            if(typeof(active_data_model.sub_source) === 'undefined') {
                active_data_model.sub_source = false;
            }

            //check if data is present and not empty
            if(data) {
                if(active_data_model.sub_source !== false) {
                    var resource_path = data[active_data_model.source][active_data_model.sub_source];
                } else {
                    var resource_path = data[active_data_model.source];
                }
            } else {
                var resource_path = false;
            }

            var default_parent_key = self.singulize(active_data_model.model) + '_id';

            if(typeof(active_data_model.set) === 'undefined') {
                active_data_model.set = plural;
            }

            //check if resource shadow ids array exists
            if(typeof self.Store.state[active_data_model.storage + '_ids'] === 'undefined') {
                // console.log('creating shadow ids array: ' +  active_data_model.storage + '_ids');
                self.Store.commit('addShadowIdsArray', active_data_model.storage + '_ids');
            }

            //check if data contains resource
            if(typeof(resource_path) !== "undefined" && resource_path !== false) {
                //if nested model has an parent key defined, loop through its data and add it to each row
                //use default_parent_key when no explicit parent_key has been set

                if(typeof active_data_model.parent_key !== 'undefined') {
                    var parent_key = active_data_model.parent_key;
                } else {
                    var parent_key = default_parent_key;
                }

                //if the nested model is an array of objects
                if(_.isArray(resource_path)) {
                    //set their parent_key to the parent's id
                    _.each(resource_path, function(object) {
                        object[parent_key] = data.id;
                    });
                } else {
                    resource_path[parent_key] = data.id;
                }

                if(typeof(window[active_data_model.model]) !== "undefined") {
                    if(active_data_model.chunk === false) {
                        self.activeDataLoadResource(active_data_model.model, active_data_model.module, resource_path, active_data_model.storage, active_data_model.nested_models);
                    } else {
                        //check how many times we can devide
                        var divisible = Math.floor(resource_path.length / active_data_model.chunk);



                        //can't devide even once, just load all results at once
                        if(divisible === 0) {
                            self.activeDataLoadResource(active_data_model.model, active_data_model.module, resource_path, active_data_model.storage, active_data_model.nested_models);
                        } else {
                            var i = 0;

                            var load_delay = 100; // 1/4th second;

                            var grab = active_data_model.chunk;

                            while (i < divisible) {
                                i++;

                                var delay = load_delay * i;
                                grab = grab + active_data_model.chunk;

                                setTimeout(function() {
                                    var data_set = resource_path.slice(0, grab);
                                    self.activeDataLoadResource(active_data_model.model,  active_data_model.module, data_set, active_data_model.storage, active_data_model.nested_models);
                                }, delay);
                            }
                        }
                    }
                } else {
                    console.log("%c" + "Active Data debug warning: Trying to load model " + active_data_model.model + " but it's mot loaded/required in the window", "color: #f48641");
                }
            }

            //if any nested models have been defined, loop through them and add them as well
            if(typeof active_data_model.nested_models !== 'undefined') {

                //loop nested models
                _.each(active_data_model.nested_models, function(nested_model) {
                    //loop each each found parent row, and setup the nested model
                    if(_.isArray(resource_path)) {
                        if(resource_path.length > 0) {
                            _.each(resource_path, function(object) {
                                if(object) {
                                    self.activeDataSetup([nested_model], object)
                                }
                            });
                        } else {
                            self.activeDataSetup([nested_model], false)
                        }
                    } else {
                        if(resource_path) {
                            self.activeDataSetup([nested_model], resource_path);
                        }
                    }
                });
            }
        });

        //mark the data sets as loaded, even if data was empty
        _.each(active_data_models, function(active_data_model) {
            self.setActiveDataSetLoaded(active_data_model);
        });
    }

    self.setActiveDataSetLoaded = function(active_data_model) {
        var plural = self.pluralize(active_data_model.model);

        if(typeof(active_data_model.set) === 'undefined') {
            active_data_model.set = plural;
        }



        if(!_.includes(self.Store.state.loaded_active_data_sets, active_data_model.set)) {
            self.Store.state.loaded_active_data_sets.push(active_data_model.set);
        }

        if(typeof active_data_model.nested_models !== 'undefined') {
            //loop nested models
            _.each(active_data_model.nested_models, function(nested_model) {
                self.setActiveDataSetLoaded(nested_model);
            });
        }
    }

    //used for setting keys in belongsTo/hasOne relations for data sets that have nested data but don't se the key
    //example: topic belongs to user, has user as nested data but does not have it's own user_id defined in data set
    self.setNestedModelsChildKeys = function(object, nested_models) {
        if(nested_models !== false) {
            _.each(nested_models, function(nested_model) {
                //if nested model has an child key defined, add it to it's parent
                if(typeof nested_model.child_key !== 'undefined') {
                    object[nested_model.child_key] = object[nested_model.source].id;
                }
            });
        }

        return object;
    }

    self.activeDataLoadResource = function(model, module, data, storage = false, nested_models) {
        //add to loaded active data models array so we can later check relations
        if(!_.includes(self.loaded_active_data_models, model)) {
            self.loaded_active_data_models.push(model);
        }

        var model = window[model];

        if(_.isArray(data)) {
            if(data.length > 0) {
                //filter out eager loaded models to prevent duplicates
                if(typeof(self.Store.state.required_active_data_models !== 'undefined') && self.Store.state.required_active_data_models.length > 0) {
                    //check if any models match
                    var matched_model = false;
                    _.each(self.Store.state.required_active_data_models, function(eager_loaded_model) {
                        if(eager_loaded_model.loaded === true && eager_loaded_model.plural === storage) {
                            matched_model = eager_loaded_model;
                        }
                    });

                    //if a model is found, filter duplicates
                    if(matched_model !== false) {
                        _.each(data, function(object) {
                            //filter out duplicates
                            if(parseInt(object.id) !== parseInt(matched_model.id)) {
                                object = self.setNestedModelsChildKeys(object, nested_models);
                                self.activeDataCommitResource(model, module, storage, object);
                            }
                        });
                    } else {
                        //otherwise load as normal
                        _.each(data, function(object) {
                            object = self.setNestedModelsChildKeys(object, nested_models);
                            self.activeDataCommitResource(model, module, storage, object);
                        });
                    }
                } else {
                    _.each(data, function(object) {
                        object = self.setNestedModelsChildKeys(object, nested_models);
                        self.activeDataCommitResource(model, module, storage, object);
                    });
                }
            }
        } else if(typeof data === 'object') {
            data = self.setNestedModelsChildKeys(data, nested_models);
            self.activeDataCommitResource(model, module, storage, data);
        }
    }

    //create instance, set relations and return the instance
    self.activeDataCreateResource = function(model, plural, data) {
        var instance = new model(data);

        data = null; //unset

        return instance;
    }

    //create instance and commit it to the store
    self.activeDataCommitResource = function(model, module, storage, data, sync_relations = false) {
        //self.Store.state[active_data_model.storage + '_ids']

        //if a positive id has been provided, check if not already present in store
        if(typeof(data.id) !== 'undefined' && data.id > 0) {
            //check if resource shadow ids array exists
            if(typeof(self.Store.state[storage + '_ids']) === 'undefined') {
                self.Store.commit('addShadowIdsArray', storage + '_ids');
            }

            if(_.includes(self.Store.state[storage + '_ids'], data.id)) {
                return;
            } else {
                //add it to store
                self.Store.state[storage + '_ids'].push(data.id);
            }
        }

        var instance = new model(data);

        //active data content options have different setup
        if(storage === 'active_data_content_options') {
            var plural = ActiveDataStore.pluralize(data.model_type);
            storage = 'active_data_content_options.' + plural;
        }

        var result = {storage_name: storage, data: instance, sync_relations, module: module};
        self.Store.commit('addActiveDataResource', result);

        return result;
    }

    /* find object in array by uid and return either the object or it's position in the array depeneding on the returnType provided */
    self.findObject = function(needle, array, returnType, needle_type) {
        var needle_type = needle_type || false;

        var result = false;

        //search by needle type (id, uid)
        for(var i = 0, len = array.length; i < len; i++) {
            if(needle_type === 'id') {
                if(parseInt(array[i].id) === parseInt(needle)) {
                    result = {object: array[i], index: i, found: true};
                    break;
                }
            } else if(needle_type === 'uid') {
                if(parseInt(array[i].uid) === parseInt(needle)) {
                    result = {object: array[i], index: i, found: true};
                    break;
                }
            } else {
                return 'Invalid returnType provided';
                break;
            }
        };

        if (typeof result !== 'undefined' && result !== false && result.found === true) {
            if(returnType === 'object') {
                return result.object;
            } else if(returnType === 'position' || returnType === 'index') {
                return result.index;
            } else {
                return 'Invalid returnType provided';
            }
        } else {
            return false;
        }
    }

    self.fireHooks = function(hook_action, options = {}) {
        //get hooks with given type
        var hooks = _.filter(self.hooks, function(o) { return o.hook_action === hook_action; });

        //order the hooks asc with priority (lower is higher prio)
        hooks = _.orderBy(hooks, 'priority', 'asc');

        //add store reference data
        options.store = self.Store;

        _.each(hooks, function(hook) {
            hook.callback(options);
        });
    }

    self.addHook = function(hook_data) {
        self.hooks.push(hook_data);
    }

    self.setupHooks = function(hooks) {
        if(typeof hooks !== 'undefined') {
            _.each(hooks, function(hook) {
                self.addHook(hook);
            });
        }
    }
};

window.ActiveDataStore.getters = {
    //find all active data instances of a given collection matching a key / val search
    activeDataFind: state => {
        return function (collection, value, key = 'id', module = false, options = {}) {
            if(collection.indexOf('.') > -1) {
                var storage_paths = collection.split(".");

                //set base storage path
                if(module !== false) {
                    var search = state[module];
                } else {
                    var search = state;
                }

                //build storage path from sub paths
                _.each(storage_paths, function(sub_path) {
                    search = search[sub_path];
                });
            } else {
                //set base storage path
                if(module !== false) {
                    var search = state[module][collection];
                } else {
                    var search = state[collection];
                }
            }

            //by default filter out all deleted items
            if(typeof options.filters === 'undefined') {
                options.filters = 'show_non_deleted';
            }

            if(options.filters === 'show_non_deleted') {
                var results = _.filter(search, function(o) { return o[key] === value && o.is_deleted === false; });
            } else if(options.filters === 'show_deleted') {
                var results = _.filter(search, function(o) { return o[key] === value && o.is_deleted === true; });
            } else if(options.filters === 'show_all') {
                var results = _.filter(search, function(o) { return o[key] === value; });
            }

            //order results if order_by has been set as option
            if(typeof options.order_by !== 'undefined') {
                options.order_by_direction = typeof(options.order_by_direction) !== 'undefined' ? options.order_by_direction : 'asc';

                //check if we want case sensitive, default is insensitive
                if(typeof options.order_by_case_sesitive !== 'undefined' && options.order_by_case_sesitive === true) {
                    var order_by = options.order_by;
                } else {
                    var order_by = options.order_by.toLowerCase();
                }

                results = _.orderBy(results, order_by, [options.order_by_direction]);
            }

            return results;
        };
    },

    //find the first active data instance of a given collection matching a key / val search or return false
    activeDataFindFirst: state => {
        //keys: col (collection), key (indentifier such as an uid or id, e.g. 'id'), result_type (instance or index)
        return function (collection, value, key = 'id', return_type = 'instance', module = false, options = {}) {;
            if(collection.indexOf('.') > -1) {
                var storage_paths = collection.split(".");

                //set base storage path
                if(module !== false) {
                    var search = state[module];
                } else {
                    var search = state;
                }

                //build storage path from sub paths
                _.each(storage_paths, function(sub_path) {
                    search = search[sub_path];
                });
            } else {
                //set base storage path
                if(module !== false) {
                    var search = state[module][collection];
                } else {
                    var search = state[collection];
                }
            }

            //by default filter out all deleted items
            if(typeof options.filters === 'undefined') {
                options.filters = 'show_non_deleted';
            }

            if(options.filters === 'show_non_deleted') {
                var results = _.find(search, function(o) { return o[key] === value && (o.is_deleted === false || typeof(o.is_deleted) === 'undefined'); });
            } else if(options.filters === 'show_deleted') {
                var results = _.find(search, function(o) { return o[key] === value && o.is_deleted === true; });
            } else if(options.filters === 'show_all') {
                var results = _.find(search, function(o) { return o[key] === value; });
            }

            if(typeof(results) !== 'undefined') {
                if(return_type === 'instance' || return_type === 'object') {
                    return results;
                } else {
                    return search.indexOf(results);
                }
            } else {
                return false;
            }
        };
    },

    routeActiveDataModels: state => {
        return state.route_active_data_models;
    },

    loadedActiveDataSets: state => {
        return state.loaded_active_data_sets;
    },
}

window.ActiveDataStore.mutations = {
    addShadowIdsArray(state, shadow_array) {
        var self = this;
        state[shadow_array] = [];
    },

    removeActiveDataInstance(state, info) {
        var self = this;

        if(typeof(info.module) === 'undefined') {
            info.module = false;
        }

        var index = self.getters.activeDataFindFirst(info.collection, info.value, info.key, 'index', info.module);

        if(index !== false && index > -1) {
            //before we delete, find the object itself as we need it's id
            var instance = self.getters.activeDataFindFirst(info.collection, info.value, info.key, 'object', info.module);

            //remove from shadow ids array
            if(state[info.collection + '_ids'].includes(instance.id)) {
                var ids_index = state[info.collection + '_ids'].indexOf(instance.id);
                if(index > -1) {
                    state[info.collection + '_ids'].splice(ids_index, 1);
                }
            }

            //before we can remove the object itself, check if we are targeting a store module
            if(info.module === false) {
                var search = state[info.collection];
            } else {
                var search = state[info.module][info.collection];
            }

            //remove object itself
            search.splice(index, 1);
        }
    },

    addCurrentSubmit(state, submit_type) {
        state.current_submits.push(submit_type);
    },

    removeCurrentSubmit(state, submit_type) {
        var index = state.current_submits.indexOf(submit_type);

        if(index > -1) {
            state.current_submits.splice(index, 1);
        }
    },

    setRouteActiveDataModels(state, result) {
        var self = this;

        var instances_to_keep = [];

        //check if last 3 chars are _id
        Object.keys(result).forEach(key => {
            if(key.substr(key.length - 3) === '_id') {
                var id = parseInt(result[key]);

                //first remove _id from the key
                var model = key.slice(0, key.length - 3);

                var current_instance_name = 'current_' + model;
                instances_to_keep.push(current_instance_name);

                //if we already had the resource set, but the id changed, delete the old one first
                if(typeof(state.route_active_data_models[current_instance_name]) !== 'undefined' && id !== parseInt(state.route_active_data_models[current_instance_name].id)) {
                    delete state.route_active_data_models[current_instance_name];
                }

                //if we have no resource with this instance name in the cache yet, look it up
                if(typeof(state.route_active_data_models[current_instance_name]) === 'undefined') {
                    var plural = ActiveDataStore.pluralize(model);

                    //fetch model so we can check for default module
                    var instance_model = window[ActiveDataStore.toModel(model)];

                    //fetch with module, which defaults to false if not defined in model
                    var instance = self.getters.activeDataFindFirst(plural, id, 'id', 'instance', instance_model.active_data_default_module);

                    //if found, add it to cache
                    if(instance !== false) {
                        state.route_active_data_models[current_instance_name] = instance;
                    } else {
                        if(state.active_data_mode === 'eager_load_basic') {
                            if(state.required_active_data_model_are_loaded === true) {
                                router.push('/404')
                            }
                        } else if(state.active_data_mode === 'lazy_load') {
                            //imu_todo: fetch on the fly with js (probably needs to go through an action/dispatch)

                        } else {
                            //otherwise it should have been loaded already, -> 404
                            router.push('/404')
                        }
                    }
                }
            }
        });

        //check all keys, remove each one that wasn't matched this time so we delete old entries
        Object.keys(state.route_active_data_models).forEach(key => {
            if(!instances_to_keep.includes(key)) {
                delete state.route_active_data_models[key];
            }
        });
    },

    loadActiveData(state, result) {
        if(result.data.success === true) {
            data = result.data.data;
            active_data = {};
            active_data[result.plural] = data
            ActiveDataStore.activeDataSetup([{model: result.model, set: 'custom'}], active_data);
        }
    },

    addActiveDataInstance(state, result) {
        if(typeof result.module === 'undefined') {
            result.module = false;
        }

        ActiveDataStore.activeDataCommitResource(result.model, result.module, result.plural, result.instance, true);
    },

    setupOverEagerLoadData(state, result) {
        if(typeof OverEagerEagerActiveDataModels !== 'undefined') {
            ActiveDataStore.activeDataSetup(OverEagerEagerActiveDataModels, result.data);
            state.required_active_data_model_are_loaded = true;
        }

        //apply setRouteActiveDataModels (which won't work on initial load due missing data)
        this.commit('setRouteActiveDataModels', window.router.currentRoute.params);
    },

    addActiveDataResource(state, result) {
        //check if we want to nest storage levels
        if(result.storage_name.indexOf('.') > -1) {
            var storage_paths = result.storage_name.split(".");

            //set base storage path
            if(result.module !== false) {
                var state_resource = state[result.module];
            } else {
                var state_resource = state;
            }

            //build storage path from sub paths
            _.each(storage_paths, function(sub_path) {
                state_resource = state_resource[sub_path];
            });
        } else {
            //set base storage path
            if(result.module !== false) {
                var state_resource = state[result.module][result.storage_name];
            } else {
                var state_resource = state[result.storage_name];
            }
        }

        //check if storage exists
        if(typeof state_resource !== 'undefined') {
            state_resource.push(result.data);

            if(result.sync_relations === true) {
                var index = state_resource.length - 1;
                state_resource[index].setRelations();
            }
        } else {
            console.log("Active Data debug warning: can't add active data resource, " + result.storage_name + " not defined in Store.state");
        }
    }
}

window.ActiveDataStore.actions = {
    //send a request reqeust for an active data instance, such as a create, update or custom action
    activeDataAction({ commit }, payload) {
        var self = this;

        payload = payload.data;
        var base_route = NetCode.getBaseApiRoute();
        var route_path = base_route + payload.sub_path;

        if(typeof(payload.submit_type) !== 'undefined') {
            self.commit('addCurrentSubmit', payload.submit_type);
        }

        //default
        var crud_method = 'update';
        if(typeof(payload.crud_method) !== 'undefined') {
            crud_method = payload.crud_method;
        }

        //default
        var module = false;
        if(typeof(payload.module) !== 'undefined') {
            module = payload.module;
        }

        //default
        var verb = 'post';

        if(typeof(payload.custom_verb) !== 'undefined') {
            verb = payload.custom_verb;
        } else {
            if(crud_method === 'delete') {
                verb = 'delete';
            } else if(crud_method === 'update') {
                verb = 'put';
            }
        }

        //add uid to this action
        payload.active_data_action_uid = ActiveDataStore.getNewUid();

        ActiveDataStore.fireHooks('active_data_action_before_fire', {payload: payload, crud_method: crud_method, module: module, verb: verb});

        self.netCode[verb](route_path, payload.save_data)
            .then(function(response) {
                if(response.data.success === true) {
                    ActiveDataStore.fireHooks('active_data_action_before_native_actions', {payload: payload, response: response.data});

                    //find instance by uid
                    var plural = ActiveDataStore.pluralize(payload.model);
                    var instance = false;

                    //check if instance exists by id or uid so we can update it
                    if(typeof(payload.save_data.id) !== 'undefined' && !isNaN(payload.save_data.id) && payload.save_data.id > 0) {
                        instance = self.getters.activeDataFindFirst(plural, payload.save_data.id, 'id', 'object', module);
                    } else if(typeof(payload.save_data.uid) !== 'undefined' && !isNaN(payload.save_data.uid) && payload.save_data.uid > 0) {
                        instance = self.getters.activeDataFindFirst(plural, payload.save_data.uid, 'uid', 'object', module);
                    }

                    if(instance !== false) {
                        if(crud_method === 'delete') {
                            self.commit('removeActiveDataInstance', {collection: plural, value: payload.save_data.id, key: 'id', module: module});
                        }
                        else if(crud_method === 'update' || crud_method === 'create') {
                            //if we've found the instance, we update it
                            if(typeof(payload.nested_sync) === 'undefined') {
                                var sync_options = {};
                            } else {
                                var sync_options = payload.nested_sync;
                            }

                            instance.activeDataSync(response.data.instance_data, self.state, sync_options);
                        }
                    } else {
                        //if we've not found the instance but we are creating one, insert the data in the store
                        if(crud_method === 'create') {
                            //create the instance
                            var instance = ActiveDataStore.activeDataCreateResource(window[payload.model], plural, response.data.instance_data);

                            var instance_data = {
                                model: window[payload.model],
                                instance: instance,
                                plural: plural,
                                module: module
                            };

                            self.commit('addActiveDataInstance', instance_data);
                        }
                    }

                    ActiveDataStore.fireHooks('active_data_action_on_success_before_callback', {payload: payload, response: response.data, crud_method: crud_method, module: module, verb: verb});

                    if(typeof(payload.success_callback) !== 'undefined') {
                        payload.success_callback(response.data);
                    }

                    ActiveDataStore.fireHooks('active_data_action_on_success_after_callback', {payload: payload, response: response.data, crud_method: crud_method, module: module, verb: verb});
                } else {
                    console.log(response);
                    alert('Action failed. Please try again, if this problem keeps occurring contact support.');

                    ActiveDataStore.fireHooks('active_data_action_on_failure_before_callback');

                    if(typeof (payload.failure_callback) !== 'undefined') {
                        payload.failure_callback(response.data);
                    }

                    ActiveDataStore.fireHooks('active_data_action_on_failure_after_callback', {payload: payload, crud_method: crud_method, module: module, verb: verb});
                }

                if(typeof(payload.submit_type) !== 'undefined') {
                    self.commit('removeCurrentSubmit', payload.submit_type);
                }
            }).catch(function (error) {
            console.log(error);
            alert('Action failed. Please try again, if this problem keeps occurring contact support.');

            if(typeof(payload.submit_type) !== 'undefined') {
                self.commit('removeCurrentSubmit', payload.submit_type);
            }

            ActiveDataStore.fireHooks('active_data_action_on_failure_before_callback', {payload: payload, crud_method: crud_method, module: module, verb: verb});

            if(typeof (payload.failure_callback) !== 'undefined') {
                payload.failure_callback(error);
            }

            ActiveDataStore.fireHooks('active_data_action_on_failure_after_callback', {payload: payload, crud_method: crud_method, module: module, verb: verb});
        });
    },
}

//Merge the store's own getters, mutations etc with the ones supplied by ActiveData
window.ActiveDataStore.mergeStoreProperties = function(store_data, type) {
    for (var prop in ActiveDataStore[type]) {
        if(ActiveDataStore[type].hasOwnProperty(prop)) {
            //only add if the store does not want to override
            if(typeof(store_data[prop]) === 'undefined') {
                store_data[prop] = ActiveDataStore[type][prop];
            }
        }
    }

    return store_data;
}