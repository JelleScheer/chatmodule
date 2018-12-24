<template>
    <div class="main-wrapper flex-center-vh">
        <div class="chat-box flex flex-column card">
            <div class="flex chat-top">
                <div class="flex flex-1 user-info">
                    <div class="flex flex-1 flex-center-v card-inner">
                        <i class="fa fa-circle active-status online"></i>
                        <span>{{ user.name }}</span>
                    </div>
                </div>
                <div class="flex flex-center-v flex-3 active-chats">
                    <div class="active-chats-wrapper flex flex-1 flex-end">
                        <span v-for="chat in activeChats" @click="showChat(chat)" class="chat" :class="{'active-chat': chat.id === activeChat.id}">
                            {{ chat.name }}
                        </span>
                    </div>
                    <div class="chat-actions" v-if="activeChat">
                        <i class="fa fa-door-open leave-chat hover-opacity" @click="leaveRoom"></i>
                    </div>
                </div>
            </div>
            <div class="flex flex-1">
                <div class="chat-box-left-column flex flex-column flex-1">
                    <div class="chat-view-switch flex">
                        <span class="flex-1 align-center" :class="{'active': view === 'chats'}" @click="view = 'chats'">Chats</span>
                        <span class="flex-1 align-center" :class="{'active': view === 'users'}" @click="view = 'users'">Users</span>
                    </div>
                    <div class="chats-overview flex-1 overflow-scroll">
                        <template v-if="view === 'chats'">
                            <template v-if="chats.length > 0" v-for="chat in chats">
                                <div class="chat-preview card-inner hover" @click="joinRoom(chat)">
                                    {{ chat.name }}
                                </div>
                            </template>

                            <template v-else>
                                No active chatrooms found.
                            </template>
                        </template>
                        <template v-else>
                            <template v-for="user in activeChatUsers">
                                <div class="user card-inner">
                                    <i class="far fa-user"></i>
                                    {{ user.name }}
                                </div>
                            </template>
                        </template>
                    </div>
                    <div class="create-chat">
                        <div class="subtle-btn flex flex-center-vh">
                            <i class="far fa-plus"></i>
                            <p @click="openCreateWizard">Create a chatroom</p>
                        </div>
                    </div>
                </div>

                <div class="flex-3 main-chat">
                    <div v-if="!activeChat && !creatingRoom" class="no-active-rooms flex flex-column flex-full-height flex-center-vh">
                        <h3>You have no active chatrooms!</h3>
                        <p>Why don't you start by joining or creating one?</p>
                    </div>
                    <div v-if="creatingRoom" class="creating-room flex flex-column flex-full-height flex-center-vh">
                        <h4>Your <b>OWN</b> room?!</h4>
                        <input type="text" v-model="newChatRoomName" placeholder="Chat room name">
                        <textarea type="textarea" v-model="newChatRoomDesc" placeholder="Chat room description"></textarea>
                        <div class="general-btn" @click="submitNewChat">
                            <p>Create room</p>
                        </div>
                        <span @click="creatingRoom = false;">nah nvm.</span>
                    </div>
                    <chat :chat="chat" v-for="chat in activeChats" :key="chat.id" v-show="activeChat.id === chat.id"></chat>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import {mapState, mapMutations} from 'vuex';

    export default {
        name: 'Chats',

        data() {
            return {
                creatingRoom: false,
                newChatRoomName: '',
                newChatRoomDesc: '',
                view: 'chats',
            }
        },

        computed: {
            ...mapState([
                'chats',
                'user',
                'activeChat',
                'activeChats',
                'activeChatUsers',
            ])
        },

        mounted() {
            let self = this;

            this.fetchChats();
            this.initBroadcastListeners();
        },

        methods: {
            fetchChats() {
                this.$store.dispatch('fetchChats');
            },

            initBroadcastListeners() {
                Echo.channel('chat.list')
                    .listen('CreateChat', (e) => {
                        this.$store.commit('addRoom', e);
                    });

                Echo.channel('chat.deleted')
                    .listen('DeleteChat', (e) => {
                        let chat = this.$store.getters.getRoomId(e.chat.id);
                        this.$store.commit('deleteRoom', chat);
                    });
            },

            openCreateWizard() {
                this.creatingRoom = true;
            },

            submitNewChat() {
                let newChat = {
                    name: this.newChatRoomName,
                    description: this.newChatRoomDesc
                };

                axios.post('/chats', newChat).then(response => {
                    if(response.data.status !== 200) {
                        alert('The room could not be created. The chat server might be offline.');
                    } else {
                        this.newChatRoomName = '';
                        this.newChatRoomDesc = '';
                        this.creatingRoom = false;
                    }
                });
            },

            showChat(chat) {
                this.$store.commit('setActiveChat', chat);
                this.view = 'users';
            },

            leaveRoom() {
                this.$store.dispatch('leaveCurrentRoom', this.activeChat.id);
            },

            joinRoom(room) {
                this.$store.dispatch('joinRoom', room);
            }
        }
    }
</script>
