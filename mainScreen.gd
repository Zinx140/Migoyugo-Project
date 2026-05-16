extends Node2D

@onready var scene_tree = get_tree()

@export var mainMenuScene : PackedScene

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_vs_player_button_down() -> void:
	$MenuNode.hide()
	$MenuNode/MenuBackground.visible = false
	$MenuNode/MenuCanvasLayer.visible = false
	$VSPlayerNode.show()
	$VSPlayerNode/VSPlayerBackground.visible = true
	$VSPlayerNode/VSPlayerCanvasLayer.visible = true
	pass # Replace with function body.
