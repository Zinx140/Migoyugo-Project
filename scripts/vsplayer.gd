extends Node2D

@export var vsPlayerScene: PackedScene
@onready var placingMigoSound = $placingMigoEffect

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_back_button_button_down() -> void:
	AudioManager.play_click()
	get_tree().change_scene_to_file(
		"res://scenes/menu.tscn"
	)
	pass # Replace with function body.

func _on_play_again_btn_button_down() -> void:
	AudioManager.play_click()
	get_tree().change_scene_to_file(
		"res://scenes/vsplayer.tscn"
	)
	pass # Replace with function body.

func _on_exit_btn_button_down() -> void:
	AudioManager.play_click()
	get_tree().change_scene_to_file(
		"res://scenes/menu.tscn"
	)
	pass # Replace with function body.
