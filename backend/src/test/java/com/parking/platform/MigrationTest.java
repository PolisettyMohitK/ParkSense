package com.parking.platform;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs Flyway's migrations against a real MySQL (Aiven-local equivalent), then boots
 * the application with {@code ddl-auto=validate}: the context only comes up if the
 * entities match {@code V1__baseline.sql} exactly.
 *
 * <p>Skipped unless {@code MIGRATION_TEST_DB_URL} is set, so H2-based local runs stay
 * fast. CI wires it to a MySQL service container.
 */
@SpringBootTest
@ActiveProfiles("migration-test")
@EnabledIfEnvironmentVariable(named = "MIGRATION_TEST_DB_URL", matches = ".+")
class MigrationTest {

    static final List<String> TABLES = List.of(
            "organizations",
            "parking_sites",
            "parking_zones",
            "parking_spaces",
            "reservations",
            "parking_sessions",
            "occupancy_events",
            "monitoring_devices",
            "site_surveys",
            "users",
            "vehicles");

    @Autowired private JdbcTemplate jdbc;

    @Test
    void flywayAppliesTheBaselineAndJpaValidatesIt() {
        Integer applied = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success = 1", Integer.class);
        assertThat(applied).isNotNull().isGreaterThanOrEqualTo(1);

        for (String table : TABLES) {
            Integer found = jdbc.queryForObject(
                    "select count(*) from information_schema.tables "
                            + "where table_schema = database() and table_name = ?",
                    Integer.class, table);
            assertThat(found).as("table %s exists", table).isEqualTo(1);
        }
    }
}
