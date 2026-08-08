<?php

declare(strict_types=1);

$directContactPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/contact'), PHP_URL_PATH);

if (in_array($directContactPath, ['/contact.php', '/contact/index.php'], true)) {
    header('Location: /contact', true, 301);
    exit;
}

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/compact-footer.php';
require_once __DIR__ . '/../shared/php/auth.php';
require_once __DIR__ . '/../shared/php/stats-lib.php';

mineacle_auth_private_headers();
$authUser = mineacle_auth_require_login('/contact');

function mineacle_contact_uuid(string $value): string
{
    return strtolower((string) preg_replace('/[^a-f0-9]/i', '', $value));
}

function mineacle_contact_rate_limit(
    string $scope,
    int $cooldown = 60,
    int $maximum = 5,
    int $window = 3600
): ?string {
    $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'mineacle-contact-limits';

    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        return null;
    }

    $path = $directory
        . DIRECTORY_SEPARATOR
        . hash('sha256', 'mineacle-contact-v3|' . $scope)
        . '.json';

    $handle = @fopen($path, 'c+');

    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }

        return null;
    }

    $now = time();
    $raw = stream_get_contents($handle);
    $stored = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
    $timestamps = [];

    if (is_array($stored)) {
        foreach ($stored as $timestamp) {
            $value = (int) $timestamp;

            if ($value > $now - $window && $value <= $now) {
                $timestamps[] = $value;
            }
        }
    }

    sort($timestamps);
    $message = null;
    $lastSubmission = $timestamps !== [] ? (int) end($timestamps) : 0;

    if ($lastSubmission > 0 && $now - $lastSubmission < $cooldown) {
        $message = 'Please wait a minute before sending another message.';
    } elseif (count($timestamps) >= $maximum) {
        $message = 'Too many messages were sent recently. Please try again later.';
    } else {
        $timestamps[] = $now;
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, (string) json_encode($timestamps));
        fflush($handle);
        @chmod($path, 0600);
    }

    flock($handle, LOCK_UN);
    fclose($handle);

    return $message;
}

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$contactConfig = is_array($config['contact'] ?? null) ? $config['contact'] : [];

$publicContactEmail = 'hello@mineacle.net';

$categories = [
    'bug' => [
        'label' => 'Bug Report',
        'title' => 'Something is broken',
        'copy' => 'Website, gameplay, command, or system issue.',
    ],
    'account' => [
        'label' => 'Account Help',
        'title' => 'Account or verification',
        'copy' => 'Login, verification, profile, or account access.',
    ],
    'store' => [
        'label' => 'Store Support',
        'title' => 'Store or purchase',
        'copy' => 'Purchase, Mineacle+, or store-related support.',
    ],
    'other' => [
        'label' => 'General Contact',
        'title' => 'Everything else',
        'copy' => 'Partnerships, questions, feedback, or general contact.',
    ],
];

$authUsername = trim((string) ($authUser['username'] ?? ''));
$authUuid = trim((string) ($authUser['uuid'] ?? ''));
$authUuidNormalized = mineacle_contact_uuid($authUuid);
$profile = null;
$profileHead = '';
$displayName = $authUsername !== '' ? $authUsername : 'Mineacle Player';

try {
    if ($authUsername !== '') {
        $profile = mineacle_stats_profile_by_username($authUsername);
    }
} catch (Throwable) {
    $profile = null;
}

if (is_array($profile)) {
    $profileUuid = mineacle_contact_uuid((string) ($profile['uuid'] ?? ''));

    if ($profileUuid !== '' && hash_equals($authUuidNormalized, $profileUuid)) {
        $skin = is_array($profile['skin'] ?? null) ? $profile['skin'] : [];
        $profileHead = trim((string) ($skin['head'] ?? ''));
        $displayName = mineacle_stats_display_name($profile);
    }
}

$form = [
    'category' => 'bug',
    'email' => '',
    'subject' => '',
    'message' => '',
];

$errors = [];
$sent = !empty($_SESSION['mineacle_contact_success']);
unset($_SESSION['mineacle_contact_success']);

if (!isset($_SESSION['mineacle_contact_started_at'])) {
    $_SESSION['mineacle_contact_started_at'] = time();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($form as $key => $default) {
        $form[$key] = trim((string) ($_POST[$key] ?? $default));
    }

    $honeypot = trim((string) ($_POST['website'] ?? ''));
    $startedAt = (int) ($_SESSION['mineacle_contact_started_at'] ?? 0);

    if (!mineacle_auth_verify_csrf($_POST['csrf'] ?? null)) {
        $errors[] = 'Your form session expired. Refresh the page and try again.';
    }

    if ($honeypot !== '') {
        $errors[] = 'The message could not be submitted.';
    }

    if ($startedAt > 0 && time() - $startedAt < 2) {
        $errors[] = 'Please review your message before sending it.';
    }

    if (!isset($categories[$form['category']])) {
        $errors[] = 'Choose a valid contact type.';
    }

    if (strlen($form['email']) > 254 || filter_var($form['email'], FILTER_VALIDATE_EMAIL) === false) {
        $errors[] = 'Enter a valid reply email address.';
    }

    if (strlen($form['subject']) < 4 || strlen($form['subject']) > 120) {
        $errors[] = 'Subject must be between 4 and 120 characters.';
    }

    if (strlen($form['message']) < 20 || strlen($form['message']) > 4000) {
        $errors[] = 'Message must be between 20 and 4,000 characters.';
    }

    if ($authUsername === '' || strlen($authUuidNormalized) !== 32) {
        $errors[] = 'Your Mineacle account session is invalid. Sign in again and retry.';
    }

    $configuredRecipient = trim((string) ($contactConfig['recipient'] ?? ''));
    $recipientCandidate = $configuredRecipient !== '' ? $configuredRecipient : $publicContactEmail;
    $recipient = filter_var($recipientCandidate, FILTER_VALIDATE_EMAIL);
    $fromEmail = filter_var((string) ($contactConfig['from_email'] ?? ''), FILTER_VALIDATE_EMAIL);

    if ($errors === [] && ($recipient === false || $fromEmail === false)) {
        $errors[] = 'Contact delivery is temporarily unavailable. You can email hello@mineacle.net directly.';
    }

    if ($errors === []) {
        $accountLimit = mineacle_contact_rate_limit('account:' . $authUuidNormalized);

        if ($accountLimit !== null) {
            $errors[] = $accountLimit;
        }
    }

    if ($errors === []) {
        $ipLimit = mineacle_contact_rate_limit('ip:' . mineacle_auth_client_ip());

        if ($ipLimit !== null) {
            $errors[] = $ipLimit;
        }
    }

    if ($errors === [] && $recipient !== false && $fromEmail !== false) {
        $categoryLabel = (string) $categories[$form['category']]['label'];
        $cleanSubject = (string) preg_replace('/[\r\n]+/', ' ', $form['subject']);
        $mailSubject = '[Mineacle] ' . $categoryLabel . ': ' . $cleanSubject;
        $mailBody = implode("\n", [
            'Category: ' . $categoryLabel,
            'Minecraft IGN: ' . $authUsername,
            'Display name: ' . $displayName,
            'Player UUID: ' . $authUuid,
            'Reply email: ' . $form['email'],
            'Submitted: ' . gmdate('Y-m-d H:i:s') . ' UTC',
            '',
            'Message:',
            $form['message'],
        ]);

        $headers = [
            'From: Mineacle Website <' . $fromEmail . '>',
            'Reply-To: ' . $form['email'],
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'X-Mailer: Mineacle Website',
        ];

        $delivered = @mail(
            (string) $recipient,
            $mailSubject,
            wordwrap($mailBody, 78),
            implode("\r\n", $headers)
        );

        if ($delivered) {
            $_SESSION['mineacle_contact_success'] = true;
            $_SESSION['mineacle_contact_started_at'] = time();

            header('Location: /contact', true, 303);
            exit;
        }

        $errors[] = 'The message could not be delivered. You can email hello@mineacle.net directly.';
    }
}

$assetVersion = (string) max(
    (int) (is_file(__DIR__ . '/assets/css/contact.css') ? (filemtime(__DIR__ . '/assets/css/contact.css') ?: 1) : 1),
    (int) (is_file(__DIR__ . '/assets/js/contact.js') ? (filemtime(__DIR__ . '/assets/js/contact.js') ?: 1) : 1)
);

$siteCss = __DIR__ . '/../shared/assets/css/site.css';
$navigationCss = __DIR__ . '/../shared/assets/css/navigation.css';
$secondaryCss = __DIR__ . '/../shared/assets/css/secondary-pages.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';

mineacle_page_head('Contact', [
    'meta_title' => 'Contact | Mineacle',
    'meta_description' => 'Contact Mineacle Studios, report an issue, or request account and store support.',
    'canonical_url' => 'https://mineacle.net/contact',
    'stylesheets' => [
        '/shared/assets/css/site.css?rev=' . rawurlencode((string) (is_file($siteCss) ? filemtime($siteCss) : 1)),
        '/shared/assets/css/navigation.css?rev=' . rawurlencode((string) (is_file($navigationCss) ? filemtime($navigationCss) : 1)),
        '/shared/assets/css/secondary-pages.css?rev=' . rawurlencode((string) (is_file($secondaryCss) ? filemtime($secondaryCss) : 1)),
        '/contact/assets/css/contact.css?rev=' . rawurlencode($assetVersion),
    ],
    'body_class' => 'secondary-page contact-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
    'robots' => 'noindex,follow',
]);
?>
<main class="contact-site">
    <section class="contact-hero" aria-labelledby="contact-title">
        <div class="contact-hero__grid" aria-hidden="true"></div>

        <div class="contact-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => '']); ?>

            <div class="contact-hero__layout">
                <div class="contact-hero__copy">
                    <span>Mineacle Studios</span>
                    <h1 id="contact-title">Contact</h1>
                    <p>Get in touch with the team behind Mineacle. Your verified Minecraft account is attached automatically so we can spend less time identifying the issue and more time resolving it.</p>
                </div>

                <aside class="contact-direct" aria-label="Direct contact">
                    <span class="contact-direct__eyebrow">Direct line</span>
                    <a class="contact-direct__email" href="mailto:<?php echo h($publicContactEmail); ?>">
                        <?php echo h($publicContactEmail); ?>
                    </a>
                    <p>Prefer email? Reach Mineacle Studios directly for general questions, partnerships, or anything that does not need the form.</p>

                    <div class="contact-direct__identity">
                        <div class="contact-account-head">
                            <?php if ($profileHead !== ''): ?>
                                <img src="<?php echo h($profileHead); ?>" alt="" aria-hidden="true" draggable="false">
                            <?php else: ?>
                                <span aria-hidden="true"><?php echo h(strtoupper(substr($displayName, 0, 1))); ?></span>
                            <?php endif; ?>
                        </div>

                        <div>
                            <small>Signed in as</small>
                            <strong><?php echo h($displayName); ?></strong>
                        </div>

                        <span class="contact-verified">Verified</span>
                    </div>
                </aside>
            </div>
        </div>
    </section>

    <?php if ($sent): ?>
        <section class="contact-success" role="status">
            <div class="contact-success__mark" aria-hidden="true">✓</div>
            <div>
                <span>Message sent</span>
                <h2>We have your message</h2>
                <p>Your verified Mineacle account was attached successfully. Any reply will go to the email address you provided.</p>
            </div>
            <a href="/contact">Send another</a>
        </section>
    <?php endif; ?>

    <section class="contact-channel-strip" aria-label="Contact options">
        <article>
            <span>01</span>
            <div>
                <strong>Verified form</strong>
                <p>Best for bugs, account issues, and support that needs player context.</p>
            </div>
        </article>

        <article>
            <span>02</span>
            <div>
                <strong>Email us directly</strong>
                <p><a href="mailto:<?php echo h($publicContactEmail); ?>"><?php echo h($publicContactEmail); ?></a> for general contact and business inquiries.</p>
            </div>
        </article>

        <article>
            <span>03</span>
            <div>
                <strong>One identity</strong>
                <p>Your logged-in Minecraft account is attached automatically. No player picker, no impersonation.</p>
            </div>
        </article>
    </section>

    <section class="contact-compose" aria-labelledby="contact-compose-title">
        <header class="contact-compose__header">
            <div>
                <span>Send us a message</span>
                <h2 id="contact-compose-title">What can we help with?</h2>
            </div>

            <p>Choose the closest category, give us a clear subject, and include enough detail for the team to understand what happened.</p>
        </header>

        <?php if ($errors !== []): ?>
            <div class="contact-notice" role="alert">
                <strong>Something needs your attention</strong>
                <ul>
                    <?php foreach (array_unique($errors) as $error): ?>
                        <li><?php echo h($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form
            class="contact-form"
            action="/contact"
            method="post"
            data-contact-form
            data-totem-src="/home/assets/images/totem.gif"
        >
            <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">

            <div class="contact-honeypot" aria-hidden="true">
                <label for="website">Website</label>
                <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
            </div>

            <fieldset class="contact-type-grid">
                <legend>Contact type</legend>

                <?php foreach ($categories as $value => $category): ?>
                    <label class="contact-type">
                        <input
                            type="radio"
                            name="category"
                            value="<?php echo h($value); ?>"
                            <?php echo $form['category'] === $value ? 'checked' : ''; ?>
                            required
                        >
                        <span class="contact-type__visual">
                            <small><?php echo h((string) $category['label']); ?></small>
                            <strong><?php echo h((string) $category['title']); ?></strong>
                            <em><?php echo h((string) $category['copy']); ?></em>
                        </span>
                    </label>
                <?php endforeach; ?>
            </fieldset>

            <div class="contact-fields">
                <div class="contact-fields__row">
                    <label class="contact-field">
                        <span>Reply email</span>
                        <input
                            name="email"
                            type="email"
                            maxlength="254"
                            autocomplete="email"
                            value="<?php echo h($form['email']); ?>"
                            placeholder="you@example.com"
                            required
                        >
                    </label>

                    <label class="contact-field">
                        <span>Subject</span>
                        <input
                            name="subject"
                            type="text"
                            minlength="4"
                            maxlength="120"
                            value="<?php echo h($form['subject']); ?>"
                            placeholder="Short summary"
                            required
                        >
                    </label>
                </div>

                <label class="contact-field">
                    <span>Message</span>
                    <textarea
                        name="message"
                        minlength="20"
                        maxlength="4000"
                        rows="10"
                        placeholder="Tell us what happened, what you expected, and any steps that would help us reproduce it."
                        required
                    ><?php echo h($form['message']); ?></textarea>
                </label>
            </div>

            <footer class="contact-form__footer">
                <div class="contact-form__identity">
                    <span class="contact-form__dot" aria-hidden="true"></span>
                    <p>Submitting as <strong><?php echo h($displayName); ?></strong></p>
                </div>

                <div class="contact-form__actions">
                    <span class="contact-totem-anchor" data-contact-totem-anchor aria-hidden="true"></span>
                    <a href="mailto:<?php echo h($publicContactEmail); ?>">Email instead</a>
                    <button type="submit" data-contact-submit>
                        <span data-contact-submit-label>Send Message</span>
                    </button>
                </div>
            </footer>
        </form>
    </section>

    <section class="contact-after" aria-labelledby="contact-after-title">
        <div class="contact-after__intro">
            <span>After you send</span>
            <h2 id="contact-after-title">A cleaner support experience</h2>
            <p>Every form submission arrives with the verified account context the team needs, while your reply address stays separate and under your control.</p>
        </div>

        <ol class="contact-after__steps">
            <li>
                <span>01</span>
                <div>
                    <strong>Submit</strong>
                    <p>Your message and verified player identity are packaged together.</p>
                </div>
            </li>
            <li>
                <span>02</span>
                <div>
                    <strong>Review</strong>
                    <p>Mineacle Studios can immediately see what type of request it is and who it belongs to.</p>
                </div>
            </li>
            <li>
                <span>03</span>
                <div>
                    <strong>Reply</strong>
                    <p>Any follow-up goes to the email address you entered in the form.</p>
                </div>
            </li>
        </ol>
    </section>

    <?php mineacle_compact_footer($site); ?>
</main>

<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1)),
        '/contact/assets/js/contact.js?rev=' . rawurlencode($assetVersion),
    ],
]); ?>
