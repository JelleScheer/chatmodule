<template>
    <div class="card">
        <div class="card-header font-weight-bold">Active chatroom - {{ activeChat.name }}</div>

        <div class="card-body">
            <template v-for="message in messages">
                <b>{{ message.user.name }}: </b>
                {{ message.body }}
                <br />
            </template>
        </div>

        <div class="card-footer">
            <input type="text" v-model="newMessage" placeholder="Your message">
            <button @click="sendMessage">Send</button>
            <!--
            <form method="post" action="/chats/{{ $chat->id }}/messages">
                @csrf
                <input type="text" name="body" placeholder="Your message">
                <button type="submit">Send</button>
            </form>
            -->
            <!--@if(Auth::id() === $chat->user_id)
            <form method="post" action="/chats/{{ $chat->id }}">
                @csrf
                @method('DELETE')

                <button type="submit">Delete chatroom</button>
            </form>
            @endif-->
        </div>
    </div>
</template>

<script>
    import {mapState, mapMutations} from 'vuex';

    export default {
        name: 'Chats',

        data() {
            return {
                newMessage: '',
            }
        },

        props: {
            id: {
                required: true
            }
        },

        computed: {
            ...mapState([
                'activeChat',
                'messages'
            ])
        },

        mounted() {
            var self = this;

            this.getActiveChat();
            this.fetchMessages();
            this.initBroadcastListeners();

                Echo.channel('comments.1')
                    .listen('NewComment', (e) => {
                        console.log(e);
                    });
        },

        methods: {
            getActiveChat() {
                axios.get('/activeChat/' + this.id).then(response => {
                    this.$store.commit('setActiveChat', response.data);
                });
            },

            fetchMessages() {
                axios.get('/chats/' + this.id + '/messages').then(response => {
                    this.$store.commit('setMessages', response.data);
                });
            },

            sendMessage() {
                let message = {
                    body: this.newMessage
                };

                axios.post('/chats/' + this.id + '/messages', message).then(response => {
                    console.log(response.data.status);
                });
            },

            initBroadcastListeners() {

            }
        }
    }
</script>