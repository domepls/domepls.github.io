from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Friendship',
            fields=[
                ('id', models.BigAutoField(auto_created=True,
                 primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user1', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='friendships_left', to=settings.AUTH_USER_MODEL)),
                ('user2', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='friendships_right', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('-created_at',)},
        ),
        migrations.CreateModel(
            name='FriendRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True,
                 primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), (
                    'rejected', 'Rejected'), ('cancelled', 'Cancelled')], default='pending', max_length=16)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('from_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='sent_friend_requests', to=settings.AUTH_USER_MODEL)),
                ('to_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='received_friend_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('-created_at',)},
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True,
                 primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('friend_request', 'Friend Request'), ('friend_accepted', 'Friend Accepted'), (
                    'chat_message', 'Chat Message'), ('system', 'System')], default='system', max_length=32)),
                ('title', models.CharField(max_length=160)),
                ('body', models.TextField(blank=True)),
                ('data', models.JSONField(blank=True, default=dict)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                 related_name='triggered_notifications', to=settings.AUTH_USER_MODEL)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('-created_at',)},
        ),
        migrations.AddConstraint(
            model_name='friendship',
            constraint=models.UniqueConstraint(
                fields=('user1', 'user2'), name='unique_friendship_pair'),
        ),
        migrations.AddConstraint(
            model_name='friendship',
            constraint=models.CheckConstraint(condition=models.Q(
                ('user1', models.F('user2')), _negated=True), name='friendship_no_self'),
        ),
        migrations.AddConstraint(
            model_name='friendrequest',
            constraint=models.CheckConstraint(condition=models.Q(
                ('from_user', models.F('to_user')), _negated=True), name='friend_request_no_self'),
        ),
    ]
