extends Node

var click_player : AudioStreamPlayer
var yugo_sound : AudioStreamPlayer

func _ready():
	click_player = AudioStreamPlayer.new()
	add_child(click_player)

	click_player.stream = preload("res://assets/sounds/btn_click.mp3")
	
	yugo_sound = AudioStreamPlayer.new()
	add_child(yugo_sound)

	yugo_sound.stream = preload("res://assets/sounds/yugo.wav")

func play_click():
	click_player.play()
	
func play_yugo():
	yugo_sound.play()
	
