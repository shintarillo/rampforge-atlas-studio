// RampForge Atlas Studio — Godot 4.x spatial shader
//
// Textures:
//   albedo_atlas : color atlas exported by RampForge (sRGB)
//   pbr_mask     : PBR mask exported by RampForge (linear / no sRGB)
//
// Mask channels:
//   R = roughness
//   G = metallic
//   B = normalized emission (emission / emissionScale)
//   A = opacity
//
// The PBR mask should be imported with mipmaps disabled and nearest filtering.
// The shader uses the same UV coordinates for both atlases.
//
// For smooth alpha blending, add `ALPHA = mask.a;` at the end of fragment().
// This shader uses alpha scissor/discard so the shared material can stay opaque.

shader_type spatial;

uniform sampler2D albedo_atlas : source_color, filter_linear_mipmap, repeat_disable;
uniform sampler2D pbr_mask : filter_nearest, repeat_disable;
uniform vec3 emission_tint : source_color = vec3(1.0);
uniform float emission_scale = 4.0;
uniform bool alpha_cutout = false;
uniform float alpha_threshold : hint_range(0.0, 1.0) = 0.5;

void fragment() {
    vec4 base = texture(albedo_atlas, UV);
    vec4 mask = texture(pbr_mask, UV);

    ALBEDO = base.rgb;
    ROUGHNESS = mask.r;
    METALLIC = mask.g;

    // B contains emission / emission_scale.
    // Multiplying it back gives HDR values that can drive Godot's glow.
    EMISSION = base.rgb * emission_tint * mask.b * emission_scale;

    if (alpha_cutout && mask.a < alpha_threshold) {
        discard;
    }
}
