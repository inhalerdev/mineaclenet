<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$adminPath = (string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '');
if (preg_match('/\/admin\.php$/', $adminPath) === 1) {
    header('Location: /admin', true, 302);
    exit;
}
header('X-Robots-Tag: noindex, nofollow', false);

function mineacle_admin_start_session(): void
{
    if (session_status() !== PHP_SESSION_NONE) {
        return;
    }

    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'use_strict_mode' => true,
    ]);
}

function mineacle_admin_config(): array
{
    $config = mineacle_config();

    return is_array($config['admin'] ?? null) ? $config['admin'] : [];
}

function mineacle_admin_configured_username(): string
{
    $admin = mineacle_admin_config();

    return trim((string) ($admin['username'] ?? ''));
}

function mineacle_admin_username_configured(): bool
{
    return mineacle_admin_configured_username() !== '';
}

function mineacle_admin_password_configured(): bool
{
    $admin = mineacle_admin_config();

    return trim((string) ($admin['password_hash'] ?? '')) !== '' || trim((string) ($admin['password'] ?? '')) !== '';
}

function mineacle_admin_credentials_configured(): bool
{
    return mineacle_admin_username_configured() && mineacle_admin_password_configured();
}

function mineacle_admin_username_matches(string $username): bool
{
    $configured = mineacle_admin_configured_username();
    $submitted = trim($username);

    if ($configured === '' || $submitted === '') {
        return false;
    }

    return hash_equals(strtolower($configured), strtolower($submitted));
}

function mineacle_admin_password_matches(string $password): bool
{
    $admin = mineacle_admin_config();
    $hash = trim((string) ($admin['password_hash'] ?? ''));
    $plain = (string) ($admin['password'] ?? '');

    if ($hash !== '') {
        return password_verify($password, $hash);
    }

    return $plain !== '' && hash_equals($plain, $password);
}

function mineacle_admin_login_delay_seconds(): int
{
    $lockedUntil = (int) ($_SESSION['mineacle_admin_login_locked_until'] ?? 0);

    return max(0, $lockedUntil - time());
}

function mineacle_admin_record_failed_login(): void
{
    $attempts = (int) ($_SESSION['mineacle_admin_login_attempts'] ?? 0) + 1;
    $_SESSION['mineacle_admin_login_attempts'] = $attempts;

    if ($attempts >= 5) {
        $_SESSION['mineacle_admin_login_locked_until'] = time() + 300;
    }
}

function mineacle_admin_clear_failed_login(): void
{
    unset($_SESSION['mineacle_admin_login_attempts'], $_SESSION['mineacle_admin_login_locked_until']);
}

function mineacle_admin_authenticated(): bool
{
    return !empty($_SESSION['mineacle_admin']);
}

function mineacle_admin_csrf(): string
{
    if (empty($_SESSION['mineacle_admin_csrf'])) {
        $_SESSION['mineacle_admin_csrf'] = bin2hex(random_bytes(24));
    }

    return (string) $_SESSION['mineacle_admin_csrf'];
}

function mineacle_admin_valid_csrf(): bool
{
    return hash_equals((string) ($_SESSION['mineacle_admin_csrf'] ?? ''), (string) ($_POST['csrf'] ?? ''));
}

function mineacle_admin_table_sql(): string
{
    $tables = mineacle_config()['tables'] ?? [];
    $table = (string) ($tables['announcements'] ?? 'home_announcements');

    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new RuntimeException('Invalid announcements table name.');
    }

    return '`' . $table . '`';
}

function mineacle_admin_ensure_announcements_table(PDO $pdo, string $tableSql): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS {$tableSql} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            announcement_key VARCHAR(64) NOT NULL,
            title VARCHAR(120) NOT NULL,
            eyebrow VARCHAR(48) DEFAULT 'Update',
            body VARCHAR(420) NOT NULL,
            image_url VARCHAR(512) DEFAULT NULL,
            content TEXT NULL,
            link_url VARCHAR(512) DEFAULT '#',
            sort_order INT NOT NULL DEFAULT 0,
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY home_announcements_key_unique (announcement_key),
            KEY home_announcements_sort_order_index (sort_order)
        )"
    );

    $columns = [];
    foreach ($pdo->query("SHOW COLUMNS FROM {$tableSql}") as $column) {
        $columns[strtolower((string) ($column['Field'] ?? ''))] = true;
    }

    if (!isset($columns['image_url'])) {
        $pdo->exec("ALTER TABLE {$tableSql} ADD COLUMN image_url VARCHAR(512) DEFAULT NULL AFTER body");
    }

    if (!isset($columns['content'])) {
        $pdo->exec("ALTER TABLE {$tableSql} ADD COLUMN content TEXT NULL AFTER image_url");
    }
}

function mineacle_admin_announcement_id(): int
{
    return max(0, (int) ($_POST['announcement_id'] ?? $_GET['edit'] ?? 0));
}

function mineacle_admin_trim(string $key, int $limit): string
{
    return substr(trim((string) ($_POST[$key] ?? '')), 0, $limit);
}

function mineacle_admin_clean_url(string $value, string $fallback): string
{
    $value = trim($value);

    if ($value === '') {
        return $fallback;
    }

    if ($value === '#' || str_starts_with($value, '/') || str_starts_with($value, './') || str_starts_with($value, 'assets/')) {
        return substr($value, 0, 512);
    }

    return filter_var($value, FILTER_VALIDATE_URL) ? substr($value, 0, 512) : $fallback;
}

function mineacle_admin_uploaded_image_url(): string
{
    if (!isset($_FILES['image_file']) || !is_array($_FILES['image_file'])) {
        return '';
    }

    $file = $_FILES['image_file'];
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error === UPLOAD_ERR_NO_FILE) {
        return '';
    }

    if ($error !== UPLOAD_ERR_OK) {
        throw new RuntimeException('The image upload failed. Try a smaller image or use an image URL.');
    }

    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > 5 * 1024 * 1024) {
        throw new RuntimeException('Announcement images must be 5 MB or smaller.');
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        throw new RuntimeException('The uploaded image could not be verified.');
    }

    $imageInfo = getimagesize($tmpName);
    $mime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';
    $extensions = [
        'image/gif' => 'gif',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    if (!isset($extensions[$mime])) {
        throw new RuntimeException('Use a PNG, JPG, WebP, or GIF image.');
    }

    $relativeDir = 'assets/uploads/announcements';
    $absoluteDir = __DIR__ . '/' . $relativeDir;

    if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
        throw new RuntimeException('Could not create the announcement upload folder.');
    }

    if (!is_writable($absoluteDir)) {
        throw new RuntimeException('The announcement upload folder is not writable. Use an image URL for now.');
    }

    $filename = 'announcement-' . date('YmdHis') . '-' . bin2hex(random_bytes(6)) . '.' . $extensions[$mime];
    $target = $absoluteDir . '/' . $filename;

    if (!move_uploaded_file($tmpName, $target)) {
        throw new RuntimeException('The uploaded image could not be saved.');
    }

    return '/' . $relativeDir . '/' . $filename;
}

function mineacle_admin_announcement_key(string $title): string
{
    $slug = strtolower(trim((string) preg_replace('/[^A-Za-z0-9]+/', '-', $title), '-'));

    if ($slug === '') {
        $slug = 'announcement';
    }

    return substr($slug, 0, 42) . '-' . date('YmdHis');
}

function mineacle_admin_save_announcement(PDO $pdo, string $tableSql): int
{
    $announcementId = mineacle_admin_announcement_id();
    $title = mineacle_admin_trim('title', 120);
    $eyebrow = mineacle_admin_trim('eyebrow', 48);
    $body = mineacle_admin_trim('body', 420);
    $content = mineacle_admin_trim('content', 10000);
    $uploadedImageUrl = mineacle_admin_uploaded_image_url();
    $imageUrl = $uploadedImageUrl !== '' ? $uploadedImageUrl : mineacle_admin_clean_url(mineacle_admin_trim('image_url', 512), '');
    $linkUrl = mineacle_admin_clean_url(mineacle_admin_trim('link_url', 512), '#');
    $sortOrder = max(0, min(9999, (int) ($_POST['sort_order'] ?? 10)));
    $enabled = isset($_POST['is_enabled']) ? 1 : 0;

    if ($title === '' || $body === '') {
        throw new RuntimeException('Title and short summary are required.');
    }

    if ($eyebrow === '') {
        $eyebrow = 'Update';
    }

    if (isset($_POST['remove_image']) && $uploadedImageUrl === '') {
        $imageUrl = '';
    }

    if ($announcementId > 0) {
        $statement = $pdo->prepare(
            "UPDATE {$tableSql}
            SET title = :title,
                eyebrow = :eyebrow,
                body = :body,
                image_url = :image_url,
                content = :content,
                link_url = :link_url,
                sort_order = :sort_order,
                is_enabled = :is_enabled
            WHERE id = :id"
        );
        $statement->execute([
            ':id' => $announcementId,
            ':title' => $title,
            ':eyebrow' => $eyebrow,
            ':body' => $body,
            ':image_url' => $imageUrl !== '' ? $imageUrl : null,
            ':content' => $content,
            ':link_url' => $linkUrl,
            ':sort_order' => $sortOrder,
            ':is_enabled' => $enabled,
        ]);

        return $announcementId;
    }

    $statement = $pdo->prepare(
        "INSERT INTO {$tableSql} (announcement_key, title, eyebrow, body, image_url, content, link_url, sort_order, is_enabled)
        VALUES (:announcement_key, :title, :eyebrow, :body, :image_url, :content, :link_url, :sort_order, :is_enabled)"
    );
    $statement->execute([
        ':announcement_key' => mineacle_admin_announcement_key($title),
        ':title' => $title,
        ':eyebrow' => $eyebrow,
        ':body' => $body,
        ':image_url' => $imageUrl !== '' ? $imageUrl : null,
        ':content' => $content,
        ':link_url' => $linkUrl,
        ':sort_order' => $sortOrder,
        ':is_enabled' => $enabled,
    ]);

    return (int) $pdo->lastInsertId();
}

function mineacle_admin_find_announcement(PDO $pdo, string $tableSql, int $id): array
{
    if ($id <= 0) {
        return [];
    }

    $statement = $pdo->prepare(
        "SELECT id, announcement_key, title, eyebrow, body, image_url, content, link_url, sort_order, is_enabled, updated_at
        FROM {$tableSql}
        WHERE id = :id
        LIMIT 1"
    );
    $statement->execute([':id' => $id]);
    $row = $statement->fetch();

    return is_array($row) ? $row : [];
}

function mineacle_admin_delete_announcement(PDO $pdo, string $tableSql, int $id): void
{
    if ($id <= 0) {
        throw new RuntimeException('Choose an announcement to remove.');
    }

    $statement = $pdo->prepare("DELETE FROM {$tableSql} WHERE id = :id LIMIT 1");
    $statement->execute([':id' => $id]);
}

function mineacle_admin_toggle_announcement(PDO $pdo, string $tableSql, int $id): void
{
    if ($id <= 0) {
        throw new RuntimeException('Choose an announcement to update.');
    }

    $statement = $pdo->prepare(
        "UPDATE {$tableSql}
        SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END
        WHERE id = :id"
    );
    $statement->execute([':id' => $id]);
}

function mineacle_admin_duplicate_announcement(PDO $pdo, string $tableSql, int $id): int
{
    $source = mineacle_admin_find_announcement($pdo, $tableSql, $id);

    if ($source === []) {
        throw new RuntimeException('Choose an announcement to duplicate.');
    }

    $title = 'Copy of ' . trim((string) ($source['title'] ?? 'Announcement'));
    $title = substr($title, 0, 120);
    $sortOrder = max(0, min(9999, (int) ($source['sort_order'] ?? 10) + 1));

    $statement = $pdo->prepare(
        "INSERT INTO {$tableSql} (announcement_key, title, eyebrow, body, image_url, content, link_url, sort_order, is_enabled)
        VALUES (:announcement_key, :title, :eyebrow, :body, :image_url, :content, :link_url, :sort_order, 1)"
    );
    $statement->execute([
        ':announcement_key' => mineacle_admin_announcement_key($title),
        ':title' => $title,
        ':eyebrow' => (string) ($source['eyebrow'] ?? 'Update'),
        ':body' => (string) ($source['body'] ?? ''),
        ':image_url' => (string) ($source['image_url'] ?? '') !== '' ? (string) $source['image_url'] : null,
        ':content' => (string) ($source['content'] ?? ''),
        ':link_url' => (string) ($source['link_url'] ?? '#'),
        ':sort_order' => $sortOrder,
    ]);

    return (int) $pdo->lastInsertId();
}

function mineacle_admin_recent_announcements(PDO $pdo, string $tableSql): array
{
    $statement = $pdo->query(
        "SELECT id, announcement_key, title, eyebrow, body, image_url, content, link_url, is_enabled, sort_order, updated_at
        FROM {$tableSql}
        ORDER BY sort_order ASC, id DESC
        LIMIT 24"
    );
    $rows = $statement->fetchAll();

    return is_array($rows) ? $rows : [];
}

mineacle_admin_start_session();

$site = mineacle_config()['site'] ?? [];
$config = mineacle_config();
$messages = [];
$errors = [];
$recentAnnouncements = [];
$editingAnnouncement = [];
$editingAnnouncementId = mineacle_admin_announcement_id();
$pdo = mineacle_site_db();
$tableSql = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');

    try {
        if (!mineacle_admin_valid_csrf()) {
            throw new RuntimeException('Your session expired. Refresh and try again.');
        }

        if ($action === 'login') {
            $username = (string) ($_POST['username'] ?? '');
            $password = (string) ($_POST['password'] ?? '');

            if (!mineacle_admin_credentials_configured()) {
                throw new RuntimeException('Admin username or password is not configured.');
            }

            $delay = mineacle_admin_login_delay_seconds();
            if ($delay > 0) {
                $minutes = (int) ceil($delay / 60);
                throw new RuntimeException('Too many login attempts. Try again in ' . $minutes . ' minute' . ($minutes === 1 ? '' : 's') . '.');
            }

            if (!mineacle_admin_username_matches($username) || !mineacle_admin_password_matches($password)) {
                mineacle_admin_record_failed_login();
                throw new RuntimeException('Invalid username or password.');
            }

            session_regenerate_id(true);
            mineacle_admin_clear_failed_login();
            $_SESSION['mineacle_admin'] = true;
            $_SESSION['mineacle_admin_user'] = mineacle_admin_configured_username();
            unset($_SESSION['mineacle_admin_csrf']);
            $messages[] = 'Logged in.';
        } elseif ($action === 'logout') {
            unset($_SESSION['mineacle_admin'], $_SESSION['mineacle_admin_user'], $_SESSION['mineacle_admin_csrf']);
            mineacle_admin_clear_failed_login();
            session_regenerate_id(true);
            $messages[] = 'Logged out.';
        } elseif ($action === 'save_announcement') {
            if (!mineacle_admin_authenticated()) {
                throw new RuntimeException('Please log in first.');
            }

            if (!$pdo instanceof PDO) {
                throw new RuntimeException('Database connection is not available.');
            }

            $tableSql = mineacle_admin_table_sql();
            mineacle_admin_ensure_announcements_table($pdo, $tableSql);
            $wasEditing = mineacle_admin_announcement_id() > 0;
            $editingAnnouncementId = mineacle_admin_save_announcement($pdo, $tableSql);
            $messages[] = $wasEditing ? 'Announcement saved.' : 'Announcement published.';
        } elseif ($action === 'delete_announcement') {
            if (!mineacle_admin_authenticated()) {
                throw new RuntimeException('Please log in first.');
            }

            if (!$pdo instanceof PDO) {
                throw new RuntimeException('Database connection is not available.');
            }

            $deleteId = mineacle_admin_announcement_id();
            $tableSql = mineacle_admin_table_sql();
            mineacle_admin_ensure_announcements_table($pdo, $tableSql);
            mineacle_admin_delete_announcement($pdo, $tableSql, $deleteId);
            if ($editingAnnouncementId === $deleteId) {
                $editingAnnouncementId = 0;
            }
            $messages[] = 'Announcement removed.';
        } elseif ($action === 'toggle_announcement') {
            if (!mineacle_admin_authenticated()) {
                throw new RuntimeException('Please log in first.');
            }

            if (!$pdo instanceof PDO) {
                throw new RuntimeException('Database connection is not available.');
            }

            $tableSql = mineacle_admin_table_sql();
            mineacle_admin_ensure_announcements_table($pdo, $tableSql);
            mineacle_admin_toggle_announcement($pdo, $tableSql, mineacle_admin_announcement_id());
            $messages[] = 'Announcement visibility updated.';
        } elseif ($action === 'duplicate_announcement') {
            if (!mineacle_admin_authenticated()) {
                throw new RuntimeException('Please log in first.');
            }

            if (!$pdo instanceof PDO) {
                throw new RuntimeException('Database connection is not available.');
            }

            $tableSql = mineacle_admin_table_sql();
            mineacle_admin_ensure_announcements_table($pdo, $tableSql);
            $editingAnnouncementId = mineacle_admin_duplicate_announcement($pdo, $tableSql, mineacle_admin_announcement_id());
            $messages[] = 'Announcement duplicated and published.';
        }
    } catch (Throwable $error) {
        $errors[] = $error->getMessage();
    }
}

if (mineacle_admin_authenticated() && $pdo instanceof PDO) {
    try {
        $tableSql = $tableSql !== '' ? $tableSql : mineacle_admin_table_sql();
        mineacle_admin_ensure_announcements_table($pdo, $tableSql);
        $editingAnnouncement = mineacle_admin_find_announcement($pdo, $tableSql, $editingAnnouncementId);
        $recentAnnouncements = mineacle_admin_recent_announcements($pdo, $tableSql);
    } catch (Throwable $error) {
        $errors[] = $error->getMessage();
    }
}

$csrf = mineacle_admin_csrf();
$homeDatabaseEnabled = (bool) ($config['home']['database_enabled'] ?? false);
$isEditingAnnouncement = $editingAnnouncement !== [];
$editAnnouncementId = (int) ($editingAnnouncement['id'] ?? 0);
$editEyebrow = (string) ($editingAnnouncement['eyebrow'] ?? 'Latest');
$editTitle = (string) ($editingAnnouncement['title'] ?? '');
$editImageUrl = (string) ($editingAnnouncement['image_url'] ?? '');
$editLinkUrl = (string) ($editingAnnouncement['link_url'] ?? '');
$editBody = (string) ($editingAnnouncement['body'] ?? '');
$editContent = (string) ($editingAnnouncement['content'] ?? '');
$editSortOrder = (string) ($editingAnnouncement['sort_order'] ?? '10');
$editIsEnabled = !$isEditingAnnouncement || ((int) ($editingAnnouncement['is_enabled'] ?? 0)) === 1;

mineacle_page_head('Admin');
?>
<main class="admin-page" aria-label="Mineacle admin">
    <section class="admin-panel admin-hero">
        <div>
            <p>Mineacle Admin</p>
            <h1>Announcements</h1>
            <span>Post homepage updates, attach an image URL, and write the full read-more copy.</span>
        </div>
        <?php if (mineacle_admin_authenticated()): ?>
            <form method="post" action="/admin">
                <input type="hidden" name="csrf" value="<?php echo h($csrf); ?>">
                <input type="hidden" name="action" value="logout">
                <button class="admin-button admin-button-secondary" type="submit">Log Out</button>
            </form>
        <?php endif; ?>
    </section>

    <?php foreach ($messages as $message): ?>
        <p class="admin-notice is-success"><?php echo h($message); ?></p>
    <?php endforeach; ?>

    <?php foreach ($errors as $error): ?>
        <p class="admin-notice is-error"><?php echo h($error); ?></p>
    <?php endforeach; ?>

    <?php if (!mineacle_admin_credentials_configured()): ?>
        <section class="admin-panel">
            <h2>Admin Credentials Needed</h2>
            <p class="admin-muted">Set <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code> or <code>ADMIN_PASSWORD_HASH</code> in Wasmer environment variables before this page can publish updates.</p>
        </section>
    <?php elseif (!mineacle_admin_authenticated()): ?>
        <section class="admin-panel admin-login">
            <h2>Log In</h2>
            <form method="post" action="/admin">
                <input type="hidden" name="csrf" value="<?php echo h($csrf); ?>">
                <input type="hidden" name="action" value="login">
                <label>
                    <span>Username</span>
                    <input name="username" type="text" autocomplete="username" required>
                </label>
                <label>
                    <span>Password</span>
                    <input name="password" type="password" autocomplete="current-password" required>
                </label>
                <button class="admin-button" type="submit">Log In</button>
            </form>
        </section>
    <?php else: ?>
        <?php if (!$homeDatabaseEnabled): ?>
            <p class="admin-notice">Announcements now publish to the homepage from this admin panel. <code>HOME_DATABASE_ENABLED=true</code> is only needed for optional database-managed hero, footer, and social sections.</p>
        <?php endif; ?>

        <section class="admin-grid">
            <form id="announcement-editor" class="admin-panel admin-form" method="post" action="/admin#announcement-editor" enctype="multipart/form-data">
                <input type="hidden" name="csrf" value="<?php echo h($csrf); ?>">
                <input type="hidden" name="action" value="save_announcement">
                <input type="hidden" name="announcement_id" value="<?php echo h((string) $editAnnouncementId); ?>">
                <div class="admin-form-heading">
                    <h2><?php echo $isEditingAnnouncement ? 'Edit Announcement' : 'New Announcement'; ?></h2>
                    <?php if ($isEditingAnnouncement): ?>
                        <a href="/admin#announcement-editor">New Post</a>
                    <?php endif; ?>
                </div>
                <label>
                    <span>Small Label</span>
                    <input name="eyebrow" type="text" maxlength="48" placeholder="Latest" value="<?php echo h($editEyebrow !== '' ? $editEyebrow : 'Latest'); ?>">
                </label>
                <label>
                    <span>Title</span>
                    <input name="title" type="text" maxlength="120" placeholder="Network Update" value="<?php echo h($editTitle); ?>" required>
                </label>
                <label class="admin-upload" data-admin-image-drop>
                    <span>Image Upload</span>
                    <strong data-admin-upload-label>Drag an image here or click to upload</strong>
                    <small>PNG, JPG, WebP, or GIF up to 5 MB. Uploaded images replace the image URL.</small>
                    <input name="image_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-admin-image-input>
                </label>
                <label>
                    <span>Image URL</span>
                    <input name="image_url" type="text" maxlength="512" placeholder="https://... or /assets/..." value="<?php echo h($editImageUrl); ?>">
                </label>
                <?php if ($editImageUrl !== ''): ?>
                    <div class="admin-current-image">
                        <img src="<?php echo h($editImageUrl); ?>" alt="" loading="lazy" decoding="async">
                        <label class="admin-checkbox">
                            <input name="remove_image" type="checkbox">
                            <span>Remove image on save</span>
                        </label>
                    </div>
                <?php endif; ?>
                <label>
                    <span>Optional Link</span>
                    <input name="link_url" type="text" maxlength="512" placeholder="https://..." value="<?php echo h($editLinkUrl); ?>">
                </label>
                <label>
                    <span>Short Summary</span>
                    <textarea name="body" maxlength="420" rows="3" placeholder="Short card text shown on the homepage." required><?php echo h($editBody); ?></textarea>
                </label>
                <label>
                    <span>Full Read More Copy</span>
                    <textarea name="content" maxlength="10000" rows="8" placeholder="Full update text shown in the pop up."><?php echo h($editContent); ?></textarea>
                </label>
                <div class="admin-form-row">
                    <label>
                        <span>Order</span>
                        <input name="sort_order" type="number" min="0" max="9999" value="<?php echo h($editSortOrder); ?>">
                    </label>
                    <label class="admin-checkbox">
                        <input name="is_enabled" type="checkbox"<?php echo $editIsEnabled ? ' checked' : ''; ?>>
                        <span>Visible</span>
                    </label>
                </div>
                <button class="admin-button" type="submit"><?php echo $isEditingAnnouncement ? 'Save Changes' : 'Publish'; ?></button>
            </form>

            <section class="admin-panel admin-recent">
                <h2>Recent Announcements</h2>
                <?php if ($recentAnnouncements === []): ?>
                    <p class="admin-muted">No announcements are saved yet.</p>
                <?php else: ?>
                    <div class="admin-recent-list">
                        <?php foreach ($recentAnnouncements as $announcement): ?>
                            <?php
                            $recentId = (int) ($announcement['id'] ?? 0);
                            $recentImage = (string) ($announcement['image_url'] ?? '');
                            $recentVisible = ((int) ($announcement['is_enabled'] ?? 0)) === 1;
                            ?>
                            <article<?php echo $recentId === $editAnnouncementId ? ' class="is-editing"' : ''; ?>>
                                <?php if ($recentImage !== ''): ?>
                                    <img src="<?php echo h($recentImage); ?>" alt="" loading="lazy" decoding="async">
                                <?php endif; ?>
                                <span><?php echo h((string) ($announcement['eyebrow'] ?? 'Update')); ?></span>
                                <strong><?php echo h((string) ($announcement['title'] ?? 'Announcement')); ?></strong>
                                <small><?php echo $recentVisible ? 'Visible' : 'Hidden'; ?> · Order <?php echo h((string) ($announcement['sort_order'] ?? 0)); ?></small>
                                <div class="admin-recent-actions">
                                    <a class="admin-button admin-button-secondary" href="/admin?edit=<?php echo h((string) $recentId); ?>#announcement-editor">Edit</a>
                                    <form method="post" action="/admin">
                                        <input type="hidden" name="csrf" value="<?php echo h($csrf); ?>">
                                        <input type="hidden" name="action" value="toggle_announcement">
                                        <input type="hidden" name="announcement_id" value="<?php echo h((string) $recentId); ?>">
                                        <button class="admin-button admin-button-secondary" type="submit"><?php echo $recentVisible ? 'Hide' : 'Show'; ?></button>
                                    </form>
                                    <form method="post" action="/admin#announcement-editor">
                                        <input type="hidden" name="csrf" value="<?php echo h($csrf); ?>">
                                        <input type="hidden" name="action" value="duplicate_announcement">
                                        <input type="hidden" name="announcement_id" value="<?php echo h((string) $recentId); ?>">
                                        <button class="admin-button admin-button-secondary" type="submit">Duplicate + Publish</button>
                                    </form>
                                    <form method="post" action="/admin" onsubmit="return confirm('Remove this announcement?');">
                                        <input type="hidden" name="csrf" value="<?php echo h($csrf); ?>">
                                        <input type="hidden" name="action" value="delete_announcement">
                                        <input type="hidden" name="announcement_id" value="<?php echo h((string) $recentId); ?>">
                                        <button class="admin-button admin-button-danger" type="submit">Remove</button>
                                    </form>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </section>
        </section>
    <?php endif; ?>
</main>
<?php mineacle_page_end(); ?>
