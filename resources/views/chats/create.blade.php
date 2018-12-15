@extends('layouts.app')

@section('content')
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header font-weight-bold">Create a chatroom</div>

                    <div class="card-body">
                        <form method="post" action="/chats">
                            @csrf
                            <input type="text" name="name" placeholder="Room name">
                            <input type="text" name="description" placeholder="Room description">
                            <button type="submit">Create</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection