<?php
/**
 * AgriScan AI — Guides controller.
 * GET /guides
 */

require_once __DIR__ . '/../services/database.php';

class GuidesController {
    public function handle() {
        global $pdo;
        $pdo = requireDb();
        sendJson(loadGuides($pdo));
    }
}
