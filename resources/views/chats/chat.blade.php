@extends('layouts.app')

@section('content')
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <chat id="{{ $chat->id }}" owner-id="{{ $chat->user_id }}"></chat>
            </div>
        </div>
    </div>
@endsection