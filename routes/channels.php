<?php

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

use App\Chat;

Broadcast::channel('App.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('messages.{id}', function ($user, $id) {
    return true;
});

Broadcast::channel('chat.deleted', function ($user) {
    return true;
});

Broadcast::channel('chat.list', function ($user) {
    return true;
});

Broadcast::channel('chat.{chat}', function ($user, Chat $chat) {
    if($chat->users->contains($user)) {
        return $user;
    }

    return false;
});