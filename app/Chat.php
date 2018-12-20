<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
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

    public function participants() {
        return $this->belongsToMany(User::class, 'chat_participants');
    }
}