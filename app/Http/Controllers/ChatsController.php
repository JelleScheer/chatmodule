<?php

namespace App\Http\Controllers;

use App\Chat;
use App\Events\CreateChat;
use App\Events\DeleteChat;
use Illuminate\Http\Request;

class ChatsController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return view('chats.index');
    }

    public function fetchChats() {
        $chats = Chat::get();
        $userChats = auth()->user()->chats()->get();

        return compact('chats', 'userChats');
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $chat = new Chat();

        $chat->fill($request->all());

        $chat['user_id'] = auth()->id();

        $chat->save();

        event(New CreateChat($chat, auth()->user()));

        return response()->json(['status' => 200, 'chat' => $chat]);
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\chat  $chat
     * @return \Illuminate\Http\Response
     */
    public function show(chat $chat)
    {
        //$messages = $chat->messages;

        return view('chats.chat', compact('chat'));
    }

    public function getActiveChat(chat $chat) {
        /*
        $isParticipant = $chat->participants()->where('user_id', auth()->user()->id)->exists();

        if($isParticipant === false) {
            $chat->participants()->save(auth()->user());
        }
        */

        $chat->users()->attach(auth()->user()->id);

        return $chat;
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\chat  $chat
     * @return \Illuminate\Http\Response
     */
    public function edit(chat $chat)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\chat  $chat
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, chat $chat)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\chat  $chat
     * @return \Illuminate\Http\Response
     */
    public function destroy(chat $chat)
    {
        event(New DeleteChat($chat));

        $chat->delete();

        return response()->json(['status' => 200]);
    }

    public function leave(chat $chat)
    {
        //$chat->participants()->detach(auth()->user()->id);
        $chat->users()->detach(auth()->user()->id);

        return response()->json(['status' => 200]);
    }
}