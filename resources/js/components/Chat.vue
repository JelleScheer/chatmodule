<template>
    <div class="card">
        <template v-if="activeChat">
            <div class="card-body">
                <template v-for="message in messages">
                    <b>{{ message.user.name }}: </b>
                    {{ message.body }}
                    <br />
                </template>
                <template v-if="typingUsers.length > 0">
                <span style="color: #c7c7c7">
                    <template v-for="user in typingUsers">
                        {{ user.name }}
                    </template>
                is typing...</span>
                </template>
            </div>

            <div class="card-footer">
                <input type="text" v-model="newMessage" @keyup="sendTypingEvent" placeholder="Your message">
                <button @click="sendMessage">Send</button>
                <br />
                Active members: <span class="active-member" v-for="user in users">{{ user.name }}</span>
                <br />
                <button @click="leaveRoom">Leave chat</button>

                <!--@if(Auth::id() === $chat->user_id)
                <form method="post" action="/chats/{{ $chat->id }}">
                    @csrf
                    @method('DELETE')

                    <button type="submit">Delete chatroom</button>
                </form>
                @endif-->
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
            /*
            id: {
                required: true
            },
            ownerId: {
                required: true
            }
            */
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
            //this.$store.dispatch('getActiveChat', this.id);
            //this.$store.dispatch('fetchMessages', this.id);

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

            sendTypingEvent() {
                if(this.newMessage.length > 0) {
                    Echo.join('chat.' + this.chat.id)
                        .whisper('typing', this.user);
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

            leaveRoom() {
                this.$store.dispatch('leaveCurrentRoom', this.chat.id);
            }
        },
    }
</script>

<style lang="scss" scoped>
    .active-member {
        color: #c7c7c7;
        padding-right: 5px;
    }
</style>