import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const state = {
    user: false,
    chats: [],
    activeChat: false,
    messages: [],
    activeChats: [],
    activeChatsIds: [],
    activeChatUsers: [],
};

const getters = {
    getRoomId: (state) => (id) => {
        return state.chats.map(chat => chat.id).indexOf(id);
    }
};

const mutations = {
    setChats(state, payload) {
        state.chats = payload.chats;
        state.activeChats = payload.userChats;
    },

    setActiveChat(state, payload) {
        state.activeChat = payload;
    },

    setMessages(state, payload) {
        state.messages = payload;
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

const actions = {
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
    }
};

export default new Vuex.Store({
    state,
    mutations,
    actions,
    getters
});