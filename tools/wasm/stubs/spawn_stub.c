/* Stub process-spawning API for the Emscripten build: GLib's gspawn links
 * against posix_spawn, but the browser emulator never launches processes. */
#include <spawn.h>
#include <errno.h>
int posix_spawn(pid_t *p, const char *f, const posix_spawn_file_actions_t *a, const posix_spawnattr_t *t, char *const v[], char *const e[]) { (void)p;(void)f;(void)a;(void)t;(void)v;(void)e; return ENOSYS; }
int posix_spawnp(pid_t *p, const char *f, const posix_spawn_file_actions_t *a, const posix_spawnattr_t *t, char *const v[], char *const e[]) { (void)p;(void)f;(void)a;(void)t;(void)v;(void)e; return ENOSYS; }
