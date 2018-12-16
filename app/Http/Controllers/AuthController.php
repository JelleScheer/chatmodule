<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function index() {
        $user = false;

        if(auth()->user()) {
            $user = auth()->user();
        }

        return $user;
    }
}
