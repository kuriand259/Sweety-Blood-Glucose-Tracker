import { useState } from 'react';
import {
  Alert,
  Anchor,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { AuthLayout } from '../components/AuthLayout';

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
    <AuthLayout title="Create account" subtitle="Create an account to start tracking">
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
            <Button type="submit" loading={submitting} size="md" mt="xs">
              Sign up
            </Button>
            <Text size="sm" ta="center">
              Already have an account?{' '}
              <Anchor c="dark" fw={600} component={Link} to="/login">
                Log in
              </Anchor>
            </Text>
          </Stack>
        </form>
    </AuthLayout>
  );
}
