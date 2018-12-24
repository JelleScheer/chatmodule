<template>
    <div class="chat-content flex flex-full-height flex-column">
        <template v-if="activeChat">
            <div class="flex flex-1 flex-items-end flex-align-content-end card-inner">
                <template v-for="message in messages">
                    <div class="message flex flex-full-width">
                        <span><b>{{ message.user.name }}:</b></span>
                        <p>{{ message.body }}</p>
                    </div>
                </template>
                <template v-if="typingUsers.length > 0">
                <span style="color: #c7c7c7">
                    <template v-for="user in typingUsers">
                        {{ user.name }}
                    </template>
                is typing...</span>
                </template>
            </div>

            <div class="flex flex-center-vh card-inner chat-input">
                <input class="flex-1" type="text" v-model="newMessage" @keyup="sendTypingEvent($event)" placeholder="Your message">
                <i class="fa fa-paper-plane hover-opacity" @click="sendMessage"></i>
            </div>
        </template>
        <template v-else>
            <div class="card-header font-weight-bold">
                This room is no longer active.
                <br />
                <a href="/chats/">Return</a> to all chats.
            </div>
        </template>
    </div>
</template>

<script>
    import {mapState, mapMutations} from 'vuex';

    export default {
        name: 'Chats',

        data() {
            return {
                newMessage: '',
                users: [],
                typingUsers: [],
                typingUsersIds: [],
            }
        },

        props: {
            chat: {
                required: true,
            }
        },

        computed: {
            ...mapState([
                'activeChat',
                'messages',
                'user',
            ])
        },

        mounted() {
            this.$store.dispatch('fetchMessages', this.chat.id);

            this.initBroadcastListeners();
        },

        methods: {
            sendMessage() {
                if(this.newMessage.length > 0) {
                    let message = {
                        body: this.newMessage
                    };

                    this.$store.commit('addMessage', message);

                    this.newMessage = '';

                    this.$store.dispatch('sendNewMessage', {id: this.chat.id, message: message});
                }
            },

            sendTypingEvent(e) {
                let keycode = e.keyCode;

                if(this.newMessage.length > 0) {
                    Echo.join('chat.' + this.chat.id)
                        .whisper('typing', this.user);

                    if(keycode === 13) {
                        this.sendMessage();
                    }
                } else {
                    Echo.join('chat.' + this.chat.id)
                        .whisper('stoppedTyping', this.user);
                }
            },

            initBroadcastListeners() {
                console.log('y2');
                Echo.private('messages.' + this.chat.id)
                    .listen('NewMessage', (e) => {
                        if(e.user.id !== this.user.id) {
                            this.$store.commit('addEventMessage', e);
                            this.removeTypingUser(e.user);
                        }
                    });

                Echo.channel('chat.deleted')
                    .listen('DeleteChat', (e) => {
                        if(e.chat.id == this.chat.id) {
                            this.$store.commit('deleteCurrentRoom');
                        }
                    });

                Echo.join('chat.' + this.chat.id)
                    .here(users => {
                        //this.users = users;
                        this.$store.commit('setActiveChatUsers', users);
                    })
                    .joining(user => {
                        this.users.push(user);
                    })
                    .leaving(user => {
                        this.users = this.users.filter(u => u.id !== user.id);

                        this.removeTypingUser(user);
                    })
                    .listenForWhisper('typing', (user) => {
                        if(!this.typingUsersIds.includes(user.id)) {
                            this.typingUsers.push(user);
                            this.typingUsersIds.push(user.id);
                        }
                    })
                    .listenForWhisper('stoppedTyping', (user) => {
                        this.removeTypingUser(user);
                    })
            },

            removeTypingUser(user) {
                if(this.typingUsersIds.includes(user.id)) {
                    this.typingUsers = this.typingUsers.filter(u => u.id !== user.id);
                    this.typingUsersIds = this.typingUsersIds.filter(u => u !== user.id);
                }
            },

            deleteRoom() {
                this.$store.dispatch('deleteCurrentRoom', this.chat.id);
            },
        },
    }
</script>

<style lang="scss" scoped>
    .active-member {
        color: #c7c7c7;
        padding-right: 5px;
    }
</style>