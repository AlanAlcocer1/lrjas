import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Share2, Loader2, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { socialApi, getApiErrorMessage } from '@/services/api';
import { SocialPostPreview } from '@/components/social/SocialPostPreview';
import type { SocialPlatform, SocialPost } from '@/types';

const emptyForm = {
  title: '',
  postUrl: '',
  platform: 'INSTAGRAM' as SocialPlatform,
  active: true,
  featured: true,
  sortOrder: '0',
};

export default function SocialPostsPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    socialApi
      .getAll()
      .then(setPosts)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (post: SocialPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      postUrl: post.postUrl,
      platform: post.platform,
      active: post.active,
      featured: post.featured,
      sortOrder: String(post.sortOrder),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.postUrl.trim()) {
      toast.error('Título y URL son obligatorios');
      return;
    }

    const payload = {
      title: form.title.trim(),
      postUrl: form.postUrl.trim(),
      platform: form.platform,
      active: form.active,
      featured: form.featured,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await socialApi.update(editing.id, payload);
        toast.success('Publicación actualizada');
      } else {
        await socialApi.create(payload);
        toast.success('Publicación creada');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (post: SocialPost) => {
    if (!confirm(`¿Eliminar "${post.title}"?`)) return;
    try {
      await socialApi.remove(post.id);
      toast.success('Publicación eliminada');
      load();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const toggleField = async (post: SocialPost, field: 'active' | 'featured') => {
    try {
      await socialApi.update(post.id, { [field]: !post[field] });
      load();
    } catch {
      toast.error('Error al actualizar');
    }
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 max-w-2xl">
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Redes sociales</h1>
                <p className="text-sm text-muted-foreground">
                  Publicaciones que se muestran en el inicio. Pega el enlace de Instagram o Facebook.
                </p>
              </div>
              <Button onClick={openCreate} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                Nueva publicación
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Share2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Aún no hay publicaciones. Añade enlaces de Instagram o Facebook para mostrarlos en el home.
                  </p>
                  <Button onClick={openCreate} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir la primera
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <motion.div key={post.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h2 className="font-semibold truncate">{post.title}</h2>
                              <Badge variant="outline">{post.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}</Badge>
                              {!post.active && <Badge variant="outline">Inactiva</Badge>}
                              {post.featured && post.active && (
                                <Badge className="bg-leaf/15 text-leaf-dark border-leaf/30">En inicio</Badge>
                              )}
                            </div>
                            <a
                              href={post.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-leaf-dark flex items-center gap-1 truncate"
                            >
                              {post.postUrl}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                            <p className="text-[11px] text-muted-foreground mt-1">Orden: {post.sortOrder}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(post)}>
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <Switch checked={post.active} onCheckedChange={() => toggleField(post, 'active')} />
                            Activa
                          </label>
                          <label className="flex items-center gap-2">
                            <Switch checked={post.featured} onCheckedChange={() => toggleField(post, 'featured')} />
                            Mostrar en inicio
                          </label>
                        </div>

                        {post.active && (
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-3 text-center">Vista previa</p>
                            <SocialPostPreview post={post} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar publicación' : 'Nueva publicación'}</DialogTitle>
              <DialogDescription>
                Instagram: copia el enlace del post (instagram.com/p/…). Facebook: enlace de la publicación.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="post-title">Título</Label>
                <Input
                  id="post-title"
                  placeholder="Ej: Convocatoria dinámica México"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-url">URL de la publicación</Label>
                <Input
                  id="post-url"
                  placeholder="https://www.instagram.com/p/..."
                  value={form.postUrl}
                  onChange={(e) => setForm({ ...form, postUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Red</Label>
                <Select
                  value={form.platform}
                  onValueChange={(v) => setForm({ ...form, platform: v as SocialPlatform })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-order">Orden (mayor = primero)</Label>
                <Input
                  id="post-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <label className="flex items-center justify-between">
                <span className="text-sm">Activa</span>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">Mostrar en inicio</span>
                <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              </label>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Guardar cambios' : 'Crear publicación'}
            </Button>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </AdminLayout>
  );
}
