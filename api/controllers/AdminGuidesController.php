<?php
/**
 * AgriScan AI — Admin: quản lý cẩm nang (guides + guide_sections).
 *
 *   GET    /admin/guides
 *   POST   /admin/guides                              {id?, icon?, title, subtitle?, is_published?}
 *   PATCH  /admin/guides/{id}
 *   DELETE /admin/guides/{id}
 *   POST   /admin/guides/{id}/sections                {icon?, title, body, badge?, ...}
 *   PATCH  /admin/guides/{id}/sections/{sid}
 *   DELETE /admin/guides/{id}/sections/{sid}
 *   POST   /admin/guides/{id}/sections/reorder        {order:[sid, sid, ...]}
 */

require_once __DIR__ . '/../middleware/admin.php';

class AdminGuidesController {
    public function handle($method, $target) {
        $pdo = requireAdmin();

        if ($method === 'GET' && $target === 'admin/guides') {
            $this->index($pdo);
            return;
        }

        if ($method === 'POST' && $target === 'admin/guides') {
            $this->create($pdo);
            return;
        }

        if ($method === 'PATCH' && preg_match('#^admin/guides/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->update($pdo, $m[1]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^admin/guides/([A-Za-z0-9_\-]+)$#', $target, $m)) {
            $this->destroy($pdo, $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/guides/([A-Za-z0-9_\-]+)/sections/reorder$#', $target, $m)) {
            $this->reorder($pdo, $m[1]);
            return;
        }

        if ($method === 'POST' && preg_match('#^admin/guides/([A-Za-z0-9_\-]+)/sections$#', $target, $m)) {
            $this->createSection($pdo, $m[1]);
            return;
        }

        if ($method === 'PATCH'
            && preg_match('#^admin/guides/([A-Za-z0-9_\-]+)/sections/(\d+)$#', $target, $m)) {
            $this->updateSection($pdo, $m[1], (int) $m[2]);
            return;
        }

        if ($method === 'DELETE'
            && preg_match('#^admin/guides/([A-Za-z0-9_\-]+)/sections/(\d+)$#', $target, $m)) {
            $this->destroySection($pdo, $m[1], (int) $m[2]);
            return;
        }

        sendJson(['error' => 'not found'], 404);
    }

    // ── Guides ────────────────────────────────────────────────────────

    private function index($pdo) {
        $guides = $pdo->query(
            "SELECT id, icon, title, subtitle, sort_order, is_published, created_at, updated_at
               FROM guides ORDER BY sort_order ASC, created_at ASC"
        )->fetchAll();

        $secStmt = $pdo->prepare(
            "SELECT id, icon, title, body, badge, badge_bg, badge_text, bg, sort_order
               FROM guide_sections WHERE guide_id = ? ORDER BY sort_order ASC, id ASC"
        );

        $items = [];
        foreach ($guides as $g) {
            $secStmt->execute([$g['id']]);
            $items[] = $this->mapGuide($g, $secStmt->fetchAll());
        }

        sendJson(['items' => $items, 'total' => count($items)]);
    }

    private function create($pdo) {
        $body = adminBody();
        adminRequireFields($body, ['title']);

        $id = trim((string) ($body['id'] ?? ''));
        if ($id === '') {
            $id = 'g_' . substr(adminNewId(), 0, 10);
        } elseif (!preg_match('#^[A-Za-z0-9_\-]{1,32}$#', $id)) {
            sendJson(['error' => 'invalid', 'message' => 'Mã cẩm nang chỉ gồm chữ, số, _ hoặc -.', 'field' => 'id'], 400);
        }

        $dup = $pdo->prepare("SELECT id FROM guides WHERE id = ?");
        $dup->execute([$id]);
        if ($dup->fetch()) {
            sendJson(['error' => 'duplicate', 'message' => 'Mã cẩm nang đã tồn tại.', 'field' => 'id'], 409);
        }

        $sort = isset($body['sort_order'])
            ? (int) $body['sort_order']
            : (int) $pdo->query("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM guides")->fetchColumn();

        $stmt = $pdo->prepare(
            "INSERT INTO guides (id, icon, title, subtitle, sort_order, is_published)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $id,
            mb_substr(trim((string) ($body['icon'] ?? 'help')), 0, 64),
            mb_substr(trim((string) $body['title']), 0, 128),
            mb_substr(trim((string) ($body['subtitle'] ?? '')), 0, 255),
            $sort,
            !empty($body['is_published']) ? 1 : 0,
        ]);

        adminAudit($pdo, 'admin.guide.create', 'guides', $id, null, ['title' => $body['title']]);

        sendJson(['ok' => true, 'id' => $id], 201);
    }

    private function update($pdo, $id) {
        $body = adminBody();
        $guide = $this->requireGuide($pdo, $id);

        $fields = [];
        $params = [];

        foreach (['icon' => 64, 'title' => 128, 'subtitle' => 255] as $field => $max) {
            if (array_key_exists($field, $body)) {
                $fields[] = "$field = ?";
                $params[] = mb_substr(trim((string) $body[$field]), 0, $max);
            }
        }
        if (array_key_exists('sort_order', $body)) {
            $fields[] = 'sort_order = ?';
            $params[] = (int) $body['sort_order'];
        }
        if (array_key_exists('is_published', $body)) {
            $fields[] = 'is_published = ?';
            $params[] = !empty($body['is_published']) ? 1 : 0;
        }

        if (!$fields) {
            sendJson(['error' => 'invalid', 'message' => 'Không có trường nào để cập nhật.'], 400);
        }

        $fields[] = 'updated_at = CURRENT_TIMESTAMP';
        $params[] = $id;
        $stmt = $pdo->prepare('UPDATE guides SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        adminAudit($pdo, 'admin.guide.update', 'guides', $id, $guide, $body);
        sendJson(['ok' => true]);
    }

    private function destroy($pdo, $id) {
        $guide = $this->requireGuide($pdo, $id);
        $pdo->prepare("DELETE FROM guides WHERE id = ?")->execute([$id]);
        adminAudit($pdo, 'admin.guide.delete', 'guides', $id, $guide, null);
        sendJson(['ok' => true, 'deleted' => true]);
    }

    // ── Sections ──────────────────────────────────────────────────────

    private function createSection($pdo, $guideId) {
        $this->requireGuide($pdo, $guideId);
        $body = adminBody();
        adminRequireFields($body, ['title', 'body']);

        // sort_order có UNIQUE(guide_id, sort_order) → dùng max + 1.
        $sort = isset($body['sort_order'])
            ? (int) $body['sort_order']
            : (int) $pdo->query("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM guide_sections WHERE guide_id = " . $pdo->quote($guideId))->fetchColumn();

        $stmt = $pdo->prepare(
            "INSERT INTO guide_sections
                (guide_id, icon, title, body, badge, badge_bg, badge_text, bg, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id"
        );
        $stmt->execute([
            $guideId,
            mb_substr(trim((string) ($body['icon'] ?? 'lens_blur')), 0, 64),
            mb_substr(trim((string) $body['title']), 0, 128),
            (string) $body['body'],
            mb_substr(trim((string) ($body['badge'] ?? '')), 0, 64),
            mb_substr(trim((string) ($body['badge_bg'] ?? '')), 0, 32),
            mb_substr(trim((string) ($body['badge_text'] ?? '')), 0, 32),
            mb_substr(trim((string) ($body['bg'] ?? '')), 0, 32),
            $sort,
        ]);
        $newId = (int) $stmt->fetchColumn();

        adminAudit($pdo, 'admin.guide.section.create', 'guide_sections', (string) $newId, null, ['guide' => $guideId]);

        sendJson(['ok' => true, 'id' => $newId], 201);
    }

    private function updateSection($pdo, $guideId, $sid) {
        $this->requireGuide($pdo, $guideId);
        $section = $this->requireSection($pdo, $guideId, $sid);
        $body = adminBody();

        $fields = [];
        $params = [];
        foreach (['icon' => 64, 'title' => 128, 'badge' => 64, 'badge_bg' => 32, 'badge_text' => 32, 'bg' => 32] as $field => $max) {
            if (array_key_exists($field, $body)) {
                $fields[] = "$field = ?";
                $params[] = mb_substr(trim((string) $body[$field]), 0, $max);
            }
        }
        if (array_key_exists('body', $body)) {
            $fields[] = 'body = ?';
            $params[] = (string) $body['body'];
        }
        if (array_key_exists('sort_order', $body)) {
            $fields[] = 'sort_order = ?';
            $params[] = (int) $body['sort_order'];
        }

        if (!$fields) {
            sendJson(['error' => 'invalid', 'message' => 'Không có trường nào để cập nhật.'], 400);
        }

        $fields[] = 'updated_at = CURRENT_TIMESTAMP';
        $params[] = $sid;
        $stmt = $pdo->prepare('UPDATE guide_sections SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        adminAudit($pdo, 'admin.guide.section.update', 'guide_sections', (string) $sid, $section, $body);
        sendJson(['ok' => true]);
    }

    private function destroySection($pdo, $guideId, $sid) {
        $this->requireGuide($pdo, $guideId);
        $section = $this->requireSection($pdo, $guideId, $sid);
        $pdo->prepare("DELETE FROM guide_sections WHERE id = ?")->execute([$sid]);
        adminAudit($pdo, 'admin.guide.section.delete', 'guide_sections', (string) $sid, $section, null);
        sendJson(['ok' => true, 'deleted' => true]);
    }

    private function reorder($pdo, $guideId) {
        $this->requireGuide($pdo, $guideId);
        $body = adminBody();
        $order = $body['order'] ?? null;
        if (!is_array($order) || !$order) {
            sendJson(['error' => 'invalid', 'message' => 'Thiếu danh sách thứ tự (order).', 'field' => 'order'], 400);
        }

        $ids = [];
        foreach ($order as $sid) {
            $ids[] = (int) $sid;
        }

        // UNIQUE(guide_id, sort_order): đẩy tạm sang số âm rồi ghi thứ tự mới.
        $pdo->beginTransaction();
        try {
            $tmp = $pdo->prepare("UPDATE guide_sections SET sort_order = ? WHERE id = ? AND guide_id = ?");
            foreach ($ids as $i => $sid) {
                $tmp->execute([-1 - $i, $sid, $guideId]);
            }
            $upd = $pdo->prepare("UPDATE guide_sections SET sort_order = ? WHERE id = ? AND guide_id = ?");
            foreach ($ids as $i => $sid) {
                $upd->execute([$i + 1, $sid, $guideId]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            sendJson(['error' => 'server', 'message' => 'Không đổi được thứ tự: ' . $e->getMessage()], 500);
        }

        adminAudit($pdo, 'admin.guide.section.reorder', 'guide_sections', $guideId, null, ['order' => $ids]);
        sendJson(['ok' => true]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function requireGuide($pdo, $id) {
        $stmt = $pdo->prepare("SELECT * FROM guides WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy cẩm nang.'], 404);
        }
        return $row;
    }

    private function requireSection($pdo, $guideId, $sid) {
        $stmt = $pdo->prepare("SELECT * FROM guide_sections WHERE id = ? AND guide_id = ?");
        $stmt->execute([$sid, $guideId]);
        $row = $stmt->fetch();
        if (!$row) {
            sendJson(['error' => 'not found', 'message' => 'Không tìm thấy mục trong cẩm nang.'], 404);
        }
        return $row;
    }

    private function mapGuide(array $g, array $sections) {
        return [
            'id'          => $g['id'],
            'icon'        => $g['icon'],
            'title'       => $g['title'],
            'subtitle'    => $g['subtitle'],
            'sortOrder'   => (int) $g['sort_order'],
            'isPublished' => (int) $g['is_published'] === 1,
            'createdAt'   => $g['created_at'],
            'updatedAt'   => $g['updated_at'],
            'sections'    => array_map(function ($s) {
                return [
                    'id'        => (int) $s['id'],
                    'icon'      => $s['icon'],
                    'title'     => $s['title'],
                    'body'      => $s['body'],
                    'badge'     => $s['badge'],
                    'badgeBg'   => $s['badge_bg'],
                    'badgeText' => $s['badge_text'],
                    'bg'        => $s['bg'],
                    'sortOrder' => (int) $s['sort_order'],
                ];
            }, $sections),
        ];
    }
}
