# RampForge en Godot 4

## Importación

### Atlas de color

- **Mipmaps:** activados.
- **Filtro:** Linear / Linear Mipmap.
- **Repetir:** desactivado.
- **sRGB:** activado.
- **Compresión:** VRAM comprimida si tu estilo lo tolera.

### Máscara PBR

- **Mipmaps:** desactivados.
- **Filtro:** Nearest.
- **Repetir:** desactivado.
- **sRGB:** desactivado / linear.
- **Compresión:** Lossless para conservar los bytes de las máscaras.

La máscara es una textura de datos, no una textura de color. Los valores de roughness, metallic, emisión y opacidad no deben pasar por la conversión sRGB.

## Canales

```text
R = roughness
G = metallic
B = emission / emission_scale
A = opacity
```

`emission_scale` se configura en la pestaña **PBR** de RampForge y por defecto vale `4.0`. El valor real de emisión se recupera en el shader multiplicando el canal B por esa escala.

Ejemplo:

| Valor en RampForge | Byte en el PNG | Lectura en shader | Resultado |
| --- | ---: | ---: | ---: |
| Emisión `2.0`, escala `4` | `128` | `0.502 × 4` | `2.008` |
| Roughness `0.8` | `204` | `204 / 255` | `0.8` |
| Metallic `1.0` | `255` | `1.0` | `1.0` |
| Opacidad `1.0` | `255` | `1.0` | `1.0` |

## Shader incluido

Usa [`rampforge_atlas.gdshader`](./rampforge_atlas.gdshader) en un `ShaderMaterial`.

El shader:

1. Lee el atlas de color con los UV del mesh.
2. Lee la máscara PBR con exactamente los mismos UV.
3. Asigna R a `ROUGHNESS`, G a `METALLIC` y A a un corte de alpha opcional.
4. Multiplica el color del atlas por el tinte de emisión, el canal B y la escala de emisión.

Las salidas de Godot son floats lineales. Multiplicar un color 8-bit `0..1` por una emisión de `2.0` no cambia el PNG: produce un valor HDR `2.0` en el shader. Para ver glow, activa **Glow** en el `WorldEnvironment`.

## Equivalente con VisualShader

1. Añade dos nodos **Texture2D**.
2. Asigna el atlas de color al primero y la máscara PBR al segundo. Ambos usan el mismo UV.
3. Conecta el RGB del atlas al **Albedo** del nodo de salida.
4. Conecta la máscara a un nodo **VectorDecompose**.
5. Conecta la salida `x` a **Roughness** y la salida `y` a **Metallic**.
6. Multiplica el RGB del atlas por la salida `z` y por `emission_scale`; conecta el resultado a **Emission**.
7. Si usas alpha por escisión, usa `a` con un **Step**/<0.5 y **Discard**. Para transparencia suave, conecta `a` a **Alpha** y cambia el blend mode del material.

## Opacidad y transparencia

La máscara exporta alpha directo, sin premultiplicar, para que los canales RGB sigan siendo exactos aunque la opacidad sea baja.

En Godot, una superficie con blending transparente requiere un render queue distinto y tiene coste de ordenación. Si casi todos los materiales son opacos:

- No escribas `ALPHA` y usa el shader opaco.
- Si necesitas recortes duros, usa `discard` como en el ejemplo.

Para transparencia suave, añade al final del fragmento:

```glsl
ALPHA = mask.a;
```

y configura el material para transparencia.

## Sin sangrado entre celdas

La máscara usa celdas planas alineadas con el atlas. Para evitar mezclar valores entre rampas:

- Importa la máscara con **Nearest** y **Mipmaps off**.
- Evita muestrear justo en el borde de una celda.
- Si más adelante necesitas valores PBR variables dentro de una rampa, usa mipmaps/padding y filtra con cuidado.
