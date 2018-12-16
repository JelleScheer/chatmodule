<template>
    <div class="card">
        <div class="card-header font-weight-bold">Active chatrooms</div>

        <div class="card-body">

            <template v-if="chats.length > 0" v-for="chat in chats">
                <a :href="'/chats/' + chat.id">
                    {{ chat.name }}
                </a>
                <span>by {{ chat.user.name }}</span>
                <br />
            </template>

            <template v-else>
                No active chatrooms found.
            </template>

        </div>

        <div class="card-footer">
            <a href="/chats/create">Create a chatroom</a>
        </div>
    </div>
</template>

<script>
    import {mapState, mapMutations} from 'vuex';

    export default {
        name: 'Chats',

        computed: {
            ...mapState([
                'chats'
            ])
        },

        mounted() {
            this.fetchChats();
            this.initBroadcastListeners();
        },


        methods: {
            fetchChats() {
                axios.get('/fetchChats/').then(response => {
                    this.$store.commit('setChats', response.data);
                });
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
        }
    }
</script>
