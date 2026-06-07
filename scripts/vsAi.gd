extends Node2D

@export var vsPlayerScene: PackedScene
@onready var placingMigoSound = $placingMigoEffect

var sideCanvasLayer: CanvasLayer
var vsAiCanvasLayer: CanvasLayer
var vsAiPanel: VSAIPanel

func _ready() -> void:
	sideCanvasLayer = get_tree().current_scene.find_child("SideCanvasLayer", true, false)
	vsAiCanvasLayer = get_tree().current_scene.find_child("VSAiCanvasLayer", true, false)
	vsAiPanel = get_tree().current_scene.find_child("BoardGridContainer", true, false)

	print("sideCanvasLayer = ", sideCanvasLayer)
	print("vsAiCanvasLayer = ", vsAiCanvasLayer)
	print("vsAiPanel = ", vsAiPanel)

	if sideCanvasLayer:
		sideCanvasLayer.visible = true

	if vsAiCanvasLayer:
		vsAiCanvasLayer.visible = false

func _process(delta: float) -> void:
	pass

func _on_back_button_button_down() -> void:
	AudioManager.play_click()
	get_tree().change_scene_to_file("res://scenes/menu.tscn")

func _on_play_again_btn_button_down() -> void:
	AudioManager.play_click()
	vsAiPanel.start_game(vsAiPanel.HUMAN_PLAYER)

func _on_exit_btn_button_down() -> void:
	AudioManager.play_click()
	get_tree().change_scene_to_file("res://scenes/menu.tscn")

func _on_black_side_btn_button_down() -> void:
	AudioManager.play_click()
	start_vs_ai(Constants.BLACK)

func _on_white_side_btn_button_down() -> void:
	AudioManager.play_click()
	start_vs_ai(Constants.WHITE)

func start_vs_ai(human_side) -> void:
	if sideCanvasLayer == null:
		sideCanvasLayer = get_tree().current_scene.find_child("SideCanvasLayer", true, false)

	if vsAiCanvasLayer == null:
		vsAiCanvasLayer = get_tree().current_scene.find_child("VSAiCanvasLayer", true, false)

	if vsAiPanel == null:
		vsAiPanel = get_tree().current_scene.find_child("BoardGridContainer", true, false)

	if sideCanvasLayer == null:
		print("ERROR: SideCanvasLayer tidak ditemukan")
		return

	if vsAiCanvasLayer == null:
		print("ERROR: VSAiCanvasLayer tidak ditemukan")
		return

	if vsAiPanel == null:
		print("ERROR: BoardGridContainer / VSAIPanel tidak ditemukan")
		return

	sideCanvasLayer.visible = false
	vsAiCanvasLayer.visible = true

	vsAiPanel.start_game(human_side)
