extends Node2D

@onready var scene_tree = get_tree()
@onready var btnClickSound = $btnClickEffect
@export var mainMenuScene : PackedScene

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_vs_player_button_down() -> void:
	AudioManager.play_click()
	get_tree().change_scene_to_file(
		"res://scenes/vsplayer.tscn"
	)
	pass # Replace with function body.
