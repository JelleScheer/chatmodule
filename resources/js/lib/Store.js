import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const state = {
    chats: [],
    activeChat: false,
    messages: [],
};

const getters = {

};


const mutations = {
    setChats(state, payload) {
        state.chats = payload.chats;
    },

    setActiveChat(state, payload) {
        state.activeChat = payload;
    },

    setMessages(state, payload) {
        state.messages = payload;
    }
};

const actions = {

};

export default new Vuex.Store({
    state,
    mutations,
    actions,
    getters
});