<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Auth::routes();

Route::get('/home', 'HomeController@index')->name('home');

Route::get('/user', 'AuthController@index');

Route::get('/fetchChats', 'ChatsController@fetchChats');
Route::get('/activeChat/{chat}', 'ChatsController@getActiveChat');
Route::resource('chats', 'ChatsController');
Route::post('/chats/{chat}/leave', 'ChatsController@leave');

Route::get('/chats/{chat}/messages', 'MessagesController@index');
Route::post('/chats/{chat}/messages', 'MessagesController@store');
