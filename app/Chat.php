<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use App\Events\MessageSent;
use Illuminate\Http\Request;

class Chat extends Model
{
    protected $fillable = ['name', 'description'];

    public function messages() {
        return $this->hasMany(Message::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function addMessage($request, $chat) {
        $message = new Message();

        $message->fill($request->all());

        $message['user_id'] = auth()->id();
        $message['chat_id'] = $chat->id;

        $message->save();

        //MessageSent::dispatch(auth()->user(), $message)->toOthers();
        //broadcast(new MessageSent(auth()->user(), $message));
        event(new MessageSent(auth()->user(), $message));
    }
}