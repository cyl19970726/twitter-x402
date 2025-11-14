CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wallet_address` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`last_seen_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_wallet_address_unique` ON `users` (`wallet_address`);--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`space_id` text NOT NULL,
	`space_url` text NOT NULL,
	`title` text NOT NULL,
	`creator` text,
	`audio_file_path` text,
	`transcript_file_path` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`audio_duration_seconds` integer,
	`audio_size_mb` real,
	`transcript_length` integer,
	`participants` text,
	`speaker_profiles` text,
	`first_requested_at` integer DEFAULT CURRENT_TIMESTAMP,
	`processing_started_at` integer,
	`completed_at` integer,
	`transcription_count` integer DEFAULT 0 NOT NULL,
	`chat_unlock_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_space_id_unique` ON `spaces` (`space_id`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`space_ids` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`sources` text,
	`num_spaces` integer NOT NULL,
	`amount_usdc` text NOT NULL,
	`transaction_hash` text,
	`model` text DEFAULT 'gpt-4o' NOT NULL,
	`tokens_used` integer,
	`queried_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_sessions_session_id_unique` ON `chat_sessions` (`session_id`);--> statement-breakpoint
CREATE TABLE `chat_unlocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`space_id` integer NOT NULL,
	`amount_usdc` text NOT NULL,
	`transaction_hash` text,
	`payment_verified` integer DEFAULT false NOT NULL,
	`unlocked_at` integer DEFAULT CURRENT_TIMESTAMP,
	`verified_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transcription_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`space_id` integer NOT NULL,
	`amount_usdc` text NOT NULL,
	`transaction_hash` text,
	`payment_verified` integer DEFAULT false NOT NULL,
	`paid_at` integer DEFAULT CURRENT_TIMESTAMP,
	`verified_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `processing_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`space_id` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`error_message` text,
	`last_error_at` integer,
	`queued_at` integer DEFAULT CURRENT_TIMESTAMP,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade
);
