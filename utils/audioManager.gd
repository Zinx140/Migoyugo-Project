extends Node

var click_player : AudioStreamPlayer

func _ready():
	click_player = AudioStreamPlayer.new()
	add_child(click_player)

	click_player.stream = preload("res://assets/sounds/btn_click.mp3")

func play_click():
	click_player.play()
