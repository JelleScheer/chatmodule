import Vue from 'vue'
import Vuex from 'vuex'
import ActiveData from './ActiveData-v0.3.1'

Vue.use(Vuex);

let state = {
    user: false,
    chats: [],
    activeChat: false,
    messages: [],
    activeChats: [],
    activeChatsIds: [],
    activeChatUsers: [],
    //activedata
    route_active_data_models: {},
    loaded_active_data_sets: [],
    require_active_data_models_called: false,
    required_active_data_models: [],
    required_active_data_model_are_loaded: false,
};

let getters = {
    getRoomId: (state) => (id) => {
        return state.chats.map(chat => chat.id).indexOf(id);
    }
};

let mutations = {
    setChats(state, payload) {
        //state.chats = payload.chats;

        //state.activeChats = payload.userChats;

        var data_models = [
            {
                model: 'Chat',
                source: 'chats',
            },
        ];

        ActiveDataStore.activeDataSetup(data_models, payload);

        console.log(state.chats);
    },

    setActiveChat(state, payload) {
        //state.activeChat = payload;
    },

    addToActiveChats(state, payload) {
        //state.activeChats.unshift(payload);
        //state.activeChatsIds.push(payload.id);
        //state.activeChat = payload;
    },

    setMessages(state, payload) {
        //state.messages = payload;
    },

    addEventMessage(state, payload) {
        let message = payload.message;

        message.user = payload.user;

        state.messages.push(message);
    },

    addMessage(state, payload) {
        let message = payload;

        message.user = state.user;

        state.messages.push(message);
    },

    removeMessage(state) {
        state.messages.splice(-1,1);
        alert('Something went wrong, message could not be send.');
    },

    setUser(state, payload) {
        state.user = payload;
    },

    deleteCurrentRoom(state) {
        state.activeChat = false;
    },

    addRoom(state, payload) {
        let chat = payload.chat;

        chat.user = payload.user;

        state.chats.push(chat);
    },

    deleteRoom(state, payload) {
        state.chats.splice(payload, 1);
    },

    setActiveChatUsers(state, payload) {
        state.activeChatUsers = payload;
    }
};

let actions = {
    getActiveChat(context, payload) {
        axios.get('/activeChat/' + payload).then(response => {
            context.commit('setActiveChat', response.data);
        });
    },

    fetchMessages(context, payload) {
        axios.get('/chats/' + payload + '/messages').then(response => {
            context.commit('setMessages', response.data);
        });
    },

    getUser(context) {
        axios.get('/user').then(response => {
            context.commit('setUser', response.data);
        });
    },

    sendNewMessage(context, payload) {
        axios.post('/chats/' + payload.id + '/messages', payload.message).then(response => {
            if(response.status !== 200) {
                context.commit('removeMessage');
            }
        });
    },

    deleteCurrentRoom(context, payload) {
        axios.delete('/chats/' + payload).then(response => {
            if(response.status === 200) {
                context.commit('deleteCurrentRoom');
            }
        });
    },

    leaveCurrentRoom(context, payload) {
        axios.post('/chats/' + payload + '/leave').then(response => {
            if(response.status === 200) {
                alert('leaving');
            }
        });
    },

    joinRoom(context, payload) {
        axios.post('/chats/' + payload.id + '/join').then(response => {
            if(response.status === 200) {
                context.commit('addToActiveChats', payload);
            }
        });
    },

    fetchChats(context) {
        axios.get('/fetchChats/').then(response => {
            console.log(response);
            context.commit('setChats', response.data);
        });
    }
};

getters = ActiveDataStore.mergeStoreProperties(getters, 'getters');
mutations = ActiveDataStore.mergeStoreProperties(mutations, 'mutations');
actions = ActiveDataStore.mergeStoreProperties(actions, 'actions');

export default new Vuex.Store({
    state,
    mutations,
    actions,
    getters
});