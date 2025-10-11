# Actualizar una rama local en CogniCore

Este flujo te ayuda a mantener tu rama local sincronizada con el repositorio remoto al colaborar en CogniCore. Aplícalo antes de comenzar una nueva tarea o cuando necesites incorporar cambios aprobados por otras personas.

> 💡 ¿Prefieres automatizar los pasos? Ejecuta `./tools/update_branch.py --branch main --sync-branch tu-rama` (o `python -m tools.update_branch ...`) para que el script descargue, actualice y regrese a tu rama de trabajo de forma asistida.

## 1. Preparar el entorno

1. Guarda tu trabajo actual.
2. Revisa el estado de tu copia con:
   ```bash
   git status -sb
   ```
   Si tienes cambios sin comprometer, decide si deseas confirmarlos (`git commit`) o crear un _stash_ temporal (`git stash`).

## 2. Obtener la información más reciente

Ejecuta un `fetch` para descargar las referencias actualizadas desde el remoto:

```bash
git fetch origin
```

Si trabajas con otro nombre de remoto cámbialo por `git fetch <remoto>`.

## 3. Cambiar a la rama que quieres actualizar

Por ejemplo, para actualizar `main`:

```bash
git switch main
```

Si la rama todavía no existe localmente pero sí en el remoto, crea el seguimiento automático:

```bash
git switch --track origin/main
```

## 4. Incorporar los cambios remotos

Una vez en la rama correcta, integra los commits nuevos. Las dos opciones más comunes son:

- **Fusionar (merge):**
  ```bash
  git merge origin/main
  ```
  Mantiene el historial tal como se creó en el remoto.

- **Rebase interactivo:**
  ```bash
  git pull --rebase origin main
  ```
  Reaplica tus commits locales sobre los remotos para conservar un historial lineal. Úsalo solo si conoces sus implicaciones.

Si aparecen conflictos, resuélvelos editando los archivos marcados, confirma los cambios (`git add ...`) y completa el merge con `git commit` o el rebase con `git rebase --continue`.

## 5. Verificar el resultado

1. Revisa que el historial incluya los commits nuevos:
   ```bash
   git log --oneline --graph --decorate --max-count=10
   ```
2. Ejecuta las pruebas clave del proyecto para asegurarte de que todo sigue funcionando:
   ```bash
   pytest
   python backend/demo_summary.py
   python -m compileall backend/app
   ```

## 6. Actualizar tu rama de trabajo

Si estabas desarrollando en una rama secundaria, regresa a ella y sincronízala con los cambios de `main` (o la rama base elegida):

```bash
git switch mi-rama
git merge main
```

Resuelve cualquier conflicto que surja y vuelve a ejecutar las pruebas.

## 7. Publicar los cambios

Cuando tu rama esté lista y en sincronía, empújala al remoto:

```bash
git push origin mi-rama
```

Esto mantendrá a tu equipo trabajando sobre la misma base de código actualizada.
