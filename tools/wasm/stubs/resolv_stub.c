/* Stub libresolv for the Emscripten build: GLib's GIO links against the
 * DNS resolver API but mz800emu never performs DNS lookups in the browser. */
#include <resolv.h>
#include <errno.h>
static struct __res_state g_stub_state;
struct __res_state *__res_state(void) { return &g_stub_state; }
int res_init(void) { return 0; }
int res_ninit(res_state s) { (void)s; return 0; }
void res_nclose(res_state s) { (void)s; }
int res_query(const char *d, int c, int t, unsigned char *a, int l) { (void)d;(void)c;(void)t;(void)a;(void)l; errno = ENOSYS; return -1; }
int res_nquery(res_state s, const char *d, int c, int t, unsigned char *a, int l) { (void)s;(void)d;(void)c;(void)t;(void)a;(void)l; errno = ENOSYS; return -1; }
int dn_expand(const unsigned char *m, const unsigned char *e, const unsigned char *s, char *d, int l) { (void)m;(void)e;(void)s;(void)d;(void)l; return -1; }
