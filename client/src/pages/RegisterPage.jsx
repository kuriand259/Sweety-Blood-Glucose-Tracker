import { useState } from 'react';
import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/readings" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/readings');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container size={420} py={80}>
      <Title order={1} ta="center" mb="xs">
        Sweety
      </Title>
      <Text c="dimmed" ta="center" mb="lg">
        Create an account to start tracking
      </Text>
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error ? <Alert color="red">{error}</Alert> : null}
            <TextInput
              label="Name"
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <TextInput
              label="Email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              description="At least 8 characters"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
            <Button type="submit" loading={submitting} color="teal">
              Sign up
            </Button>
            <Text size="sm" ta="center">
              Already have an account?{' '}
              <Anchor component={Link} to="/login">
                Log in
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
