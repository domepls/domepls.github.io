from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0002_project_description_project_updated_at'),
    ]

    operations = [
        migrations.CreateModel(
            name='Chat',
            fields=[
                ('id', models.BigAutoField(auto_created=True,
                 primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[
                 ('direct', 'Direct'), ('project', 'Project')], max_length=16)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='created_chats', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(blank=True, null=True,
                 on_delete=django.db.models.deletion.CASCADE, related_name='chats', to='projects.project')),
            ],
            options={'ordering': ('-updated_at',)},
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True,
                 primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('chat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='messages', to='chats.chat')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='chat_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('created_at',)},
        ),
        migrations.CreateModel(
            name='ChatMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True,
                 primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('last_read_at', models.DateTimeField(blank=True, null=True)),
                ('chat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='memberships', to='chats.chat')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                 related_name='chat_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('-joined_at',),
                     'unique_together': {('chat', 'user')}},
        ),
    ]
